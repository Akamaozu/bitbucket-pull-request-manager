// DATABASE HELPER FUNCTIONS
module.exports = function(mysql_url, db_structure, configs){

  if(!mysql_url){ throw new Error('MYSQL URL NOT SUPPLIED TO HELPER'); }
  if(!db_structure){ throw new Error('JSON REPRESENTATION OF DATABASE NOT SUPPLIED TO HELPER'); }

  var helpers, log, configs, default_callbacks,
    mysql, noticeboard, Task,
    queue, open_connections, queue_concurrency;

    mysql = require('mysql');
    Task = require('cjs-task');

    helpers = {};
    configs = configs || {};
    log = configs.log && typeof configs.log === 'function' ? configs.log : console.log;

    default_callbacks = {
      
      connect: function(error, done){

        if(error){

          log('[ERROR] COULD NOT CONNECT TO DB', error);
        }

        else {

          done();
        }
      },

      query: function(error, result){

        if(error){

          log('[ERROR] QUERY FAILED', error);
        }
      }
    }

    queue = [];
    open_connections = 0;
    queue_concurrency = configs.concurrency || 10;

  // TODO create pool of connections instead

  helpers.ADD_TABLE = function(table_structure, callback){

    var self,
      task, 
      callback;

      self = this;
      callback = callback || default_callbacks.query;

    // FILTER BAD DATA
      if(!table_structure){ callback('NO TABLE STRUCTURE GIVEN TO BE CREATED', null); return; }
      if(!table_structure.name){ callback('TABLE NAME IS MISSING', null); return; }

      if(!table_structure.columns){ callback('TABLE ' + table_structure.name + ' IS MISSING COLUMN DATA', null); return; }            
      if(Object.prototype.toString.call(table_structure.columns) !== '[object Array]' || table_structure.columns.length < 1){ callback('TABLE ' + table_structure.name + ' HAS MALFORMED COLUMN DATA', null); return; }

    // CONFIGURE TASK
      task = Task( function( error, result ){
        
        if( error ){
          return callback( error, null, task.log() );
        }

        callback( null, true, task.log() );
      });

      // task variables
        task.set('task-name', 'CREATE ' + table_structure.name + ' TABLE');
        task.set('table-structure', table_structure);
        task.set('table-params', '');

    // TASK STEPS

      // check if table exists
        task.step('check-if-table-exists', function(){

          var table_name = task.get('table-structure').name;

          self.TABLE_EXISTS( table_name, function(error, exists){

            if(error){
              task.log( error );
              task.end('TABLE ' + table_name + ' EXISTS QUERY FAILED');
            }

            else if( exists ){

              task.end('TABLE ' + table_name + ' ALREADY EXISTS');
            }

            else {
              
              task.next();
            }
          });
        });

      // add columns to table params 
        task.step('add-columns-to-params', function(){

          var each = require('./each');
          var table = task.get('table-structure');

          each(table.columns, function(column, index){

            var this_column_querystring;

            if(!column.name || !column.content){

              return task.end( table.name + ' NOT CREATED DUE TO MISSING COLUMN ' + ( !column.name ? 'NAME' : 'CONTENT' ) );
            }

            this_column_querystring = column.name + ' ' + column.content;

            if(column.options){

              each(column.options, function(option){

                this_column_querystring += ' ' + option;
              })
            }

            if((index + 1) < table.columns.length){

              this_column_querystring += ', ';
            }

            task.set('table-params', task.get('table-params') + this_column_querystring);
          });

          task.next();
        });

      // add primary key, if any
        task.step('add-primary-key', function(){

          var table = task.get('table-structure');

          if(table.primary_key){

            task.set('table-params', task.get('table-params') + ', PRIMARY KEY (' + self.escapeId( table_structure.primary_key ) + ')');
          }

          task.next();                    
        });

      // add unique keys, if any
        task.step('add-unique-keys', function(){

          var each = require('./each');
          var table = task.get('table-structure');

          if(table.unique_keys && table.unique_keys.length > 0){

            each(table.unique_keys, function(unique_key, index){

              var this_unique_querystring, unique_columns_string; 
                this_unique_querystring = '';

              if(!unique_key.name || !unique_key.columns || Object.prototype.toString.call(unique_key.columns) !== '[object Array]'){

                return task.end( table.name + ' NOT CREATED DUE TO MALFORMED UNIQUE KEY DATA');
              }

              require('./each')( unique_key.columns, function( column, index ){

                unique_key.columns[ index ] = self.escapeId( column );
              });

              this_unique_querystring += ', UNIQUE INDEX ' + self.escapeId( unique_key.name ) + ' (' + unique_key.columns.join(', ') + ')';

              task.set('table-params', task.get('table-params') + this_unique_querystring);
            });
          }

          task.next();                    
        });

      // create table
        task.step('create-table', function(){

          var table = task.get('table-structure');

          self.query('CREATE TABLE ' + self.escapeId( table.name ) + '(' + task.get('table-params') + ')', function(error, result){

            if(error){
              task.log('failed query = CREATE TABLE ' + self.escapeId( table.name ) + '(' + task.get('table-params') + ')');
              task.end({msg: 'CREATE TABLE ' + table.name + ' QUERY FAILED', payload: error});
            }

            else {
              
              task.end( null, result );
            }
          });
        });

    // START 
      task.start();
  }

  helpers.ADD_COLUMN = function(column_structure, table_name, callback){

    var self, task;

      self = this;

    // FILTER
      if(!table_name){ return callback({message: 'NO TABLE SPECIFIED TO ADD THE COLUMN TO'}); }
      if(typeof table_name !== 'string'){ return callback({message: 'TABLE NAME IS NOT A STRING'}); }

      if(!column_structure){ return callback({message: 'COLUMN DATA NOT PROVIDED'}); }
      if( Object.prototype.toString.call(column_structure) !== '[object Object]' || !column_structure.name || !column_structure.content){ return callback({message: 'MALFORMED COLUMN DATA'}); }

    // CONFIGURE TASK
      task = Task( function( error, result ){
        
        if( error ){
          return callback( error, null, task.log() );
        }

        callback( null, true, task.log() );
      });

      // task variables
        task.set('task-name', 'ADD COLUMN ' + column_structure.name + ' TO ' + table_name);
        task.set('column-structure', column_structure);
        task.set('table-name', table_name);

      // check if table exists
        task.step('check-if-table-exists', function(){

          var table_name = task.get('table-name');

          self.TABLE_EXISTS( table_name, function(error, exists){

            if(error){

              task.end({message: 'mysql query error', payload: error });
            }

            else if(!exists){

              task.end({message: 'TABLE ' + table_name + ' DOES NOT EXIST'});
            }

            else {

              task.next();   
            }
          });
        });

      // check if column exists
        task.step('check-if-column-exists', function(){

          var table, column;

            table = task.get('table-name');
            column = task.get('column-structure');

          self.COLUMN_EXISTS( column.name, table_name, function(error, exists){

            if(error){

              task.end({message: 'mysql query error', payload: error});
            }

            else if( exists ){

              task.end({message: 'COLUMN ' + column.name + ' ALREADY EXISTS IN TABLE ' + table_name});
            }

            else{

              task.next();   
            }
          });
        });

      // create column
        task.step('create-column', function(){

          var column, table_name,
            run_query, querystring;

            table_name = task.get('table-name');
            column = task.get('column-structure');
            run_query = true;

          // base querystring
            querystring = 'ALTER TABLE ' + self.escapeId( table_name ) + ' ADD COLUMN ' + self.escapeId( column.name ) + ' ' + column.content;

          // add column options to querystring
            if(column.options){

              require('./each')(column.options, function(option){

                // auto_increment check
                  if(option.toLowerCase() === 'auto_increment'){

                    // confirm column is set as table primary key
                      require('./each')(db_structure, function(table){

                        if(table.name === table_name){

                          if(table.primary_key === column.name){

                            querystring += ' primary key'; 
                          }

                          else{

                            task.end({message: column.name + ' HAS AUTO INCREMEMNT BUT ISN\'T SET AS PRIMARY KEY FOR TABLE ' + table_name});
                            run_query = false;
                          }

                          return false;
                        }
                      });
                  }

                querystring += ' ' + option;
              });
            }

          if(run_query){

            self.query(querystring, function(error, result){

              if(error){ 

                task.end({
                  message: 'mysql query error',
                  querystring: querystring,
                  payload: error
                }); 
              }

              else{

                task.end(null, {message: 'COLUMN ' + column.name + ' ADDED TO TABLE ' + table_name});
              }
            });
          }
        });

    // START TASK
      task.start();
  }

  helpers.SHOW_INDEXES = function(table_name, callback){

    var self, task, callback;

      self = this;
      callback = callback || default_callbacks.query;

    // FILTER
      if(!table_name){

        return callback(['can\'t check for indexes without a table name']);
      }

    // CONFIGURE TASK
      task = Task( function( error, result ){
        
        if( error ){
          return callback( error, null, task.log() );
        }

        callback( null, result, task.log() );
      });

      // task variables            
        task.set('task-name', 'show table indexes');
        task.set('table-name', table_name);

      // check if table exists
        task.step('check-if-table-exists', function(){

          var table_name = task.get('table-name');

          self.TABLE_EXISTS(table_name, function(error, exists){

            if(error){

              task.log({message: 'mysql query error', error: error});
              task.end( task.log() );
            }

            else{

              if(!exists){

                task.log('table ' + table_name + ' does not exist');
                task.end( task.log() );
              }

              else{

                task.log('table ' + table_name + ' found');
                task.next();
              }
            }
          });
        });

      // get table indexes
        task.step('get-table-indexes', function(){

          var table_name = task.get('table-name');

          self.query('SHOW INDEX IN ' + self.escapeId( table_name ), function(error, result){

            if(error){

              task.log({message: 'mysql query error', error: error});
              task.end( task.log() );
            }

            else{

              task.end(null, result);
            }
          })
        });

    // START TASK
      task.start();
  }

  helpers.TABLE_EXISTS = function(table_name, callback){

    var self,
      querystring,
      callback;

      self = this;

      callback = callback || default_callbacks.query;

    if(!table_name){ callback('NO TABLE NAME GIVEN', null); return; }

    querystring = 'SHOW TABLES LIKE ' + self.escape( table_name );

    self.query( querystring, function(error, result){

      if(error){

        callback({ 
          msg: 'something went wrong with the query',
          query: querystring,
          payload: error 
        }, null);
      }

      else if( result.length < 1 ){

        callback( null, false );
      }

      else {

        callback( null, true );
      }
    });
  }

  helpers.COLUMN_EXISTS = function(column_name, table_name, callback){

    var self,
      querystring,
      callback;

      self = this;

      callback = callback || default_callbacks.query;

    if(!column_name){ return callback('NO COLUMN NAME TO CHECK FOR', null); }
    if(!table_name){ return callback('NO TABLE NAME GIVEN TO CHECK', null); }

    querystring = 'SHOW COLUMNS FROM ' + self.escapeId(table_name) + ' LIKE ' + self.escape(table_name);

    self.query( querystring, function(error, result){

      if(error){

        callback({ 
          msg: 'something went wrong with the query',
          query: querystring,
          payload: error 
        }, null);
      }

      else if( result.length < 1 ){

        callback( null, false );
      }

      else {

        callback( null, true );
      }
    });
  }

  helpers.deconstruct = function(callback){

    var self, 
      each, task, 
      callback, trigger_callback, callback_triggered;

      self = this;

      each = require('./each');

      callback = callback || default_callbacks.query;
      callback_triggered = false;            
      trigger_callback = function(error, result){

        if(callback_triggered) return;

        callback( error, result, task.log() );
        callback_triggered = true;
      }

      task = Task( trigger_callback );

    // CONFIGURE TASK

      // 1. GET TABLES IN DATABASE
        task.step('get-db-tables', function(){
          
          self.query('SHOW TABLES', function(error, result){

            if(error){ return task.end( error ); }

            var tables_to_drop = [];

            each(result, function(table){

              var table_name;

              // get table name from weird format
                each(table, function(name){

                  table_name = name;

                  return false;
                })

              tables_to_drop.push( table_name );
            });

            if(tables_to_drop.length < 1){

              task.log('database is empty');
              task.end( null, task.log() );
            }

            else{

              task.set('tables-to-drop', tables_to_drop);
              task.next();
            }
          });
        });

      // 2. DROP ALL TABLES
        task.step('drop-all-tables', function(){

          var tables, tables_dropped, total_tables;
            
            tables = task.get('tables-to-drop');
            tables_dropped = 0;
            total_tables = tables.length;

          each(tables, function(table_name){

            self.query('DROP TABLE ' + self.escapeId( table_name ), function(error, result){

              if(error) task.end( error );

              else {

                task.log('DROPPED ' + table_name + ' TABLE');
                table_dropped();
              }
            })
          });

          function table_dropped(){

            tables_dropped += 1;

            if(tables_dropped === total_tables){

              task.end( null, task.log() );
            }
          }
        });

    // START TASK
      task.start();
  }

  helpers.dump = function( callback ){

    var options = require('parse-db-url')( mysql_url ),
        schema_tables = [];

    if( !options.host || !options.database ) return callback( 'could not extract required connection details from mysql url' );

    require('./each')( db_structure, function( table ){

      if( table.name ) schema_tables.push( table.name );
    });

    require('mysqldump')({

      host: options.host,
      user: options.user,
      password: options.password,
      database: options.database,

      tables: schema_tables,
      getDump: true
    }, 

    function( error, dump ){

      if( error ) return callback( error );

      callback( null, dump );
    });
  }

  helpers.construct = function(callback){

    var self,
      task, 
      callback;

      self = this;

      callback = callback || default_callbacks.query;

      task = Task( function( error, result ){
        
        if( error ){
          return callback( error, null, task.log() );
        }

        callback( null, true, task.log() );
      });

    // CONFIGURE TASK

      // 1. Confirm DB is Empty
        task.step('confirm-db-is-empty', function(){

          task.log('checking if database is empty');

          self.query('SHOW TABLES', function(error, result){

            if(error){
              task.log('could not check if database is empty');
              task.end( error );
            } 

            else if( result.length > 0 ) task.end('DATABASE IS NOT EMPTY');

            else{

              task.log('database is empty');
              task.next();
            } 
          });
        });

      // 2. Construct DB Tables
        task.step('upgrade-empty-db', function(){

          task.log('upgrading empty db');

          self.upgrade(function(err, succeeded, logs){

            task.log( logs );

            if(err) task.end( err );
            else task.end( null, true );
          })
        });

    // START TASK
      task.start();
  }

  helpers.upgrade = helpers.sync = function(callback){

    var self, task;
      
      self = this;
      task = Task( function( error ){
        
        if( error ) return callback( error, null, task.log() );

        callback( null, true, task.log() ); 
      });

    // TASK VARIABLES
      task.set('task-name', 'upgrade-db');

    // TASK CONFIG

      // get db tables
        task.step('get-db-tables', function(){

          self.query('show tables', function(error, result){

            var db_tables, each;
              
              db_tables = [];
              each = require('./each');

            if(error){

              task.log( error );
              task.end( 'could not fetch production db tables' );
            }

            else {

              each(result, function(entry){

                each(entry, function(table_name){

                  db_tables.push( table_name );
                })
              });

              task.log('successfully fetched production db tables');
              task.set('db-tables', db_tables);
              
              task.next();
            }
          })
        });

      // confirm schema tables are in db
        task.step('confirm-schema-tables-exist-in-db', function(){

          var missing_schema_tables, each;

            missing_schema_tables = [];
            each = require('./each');

          each(db_structure, function(schema_table){

            if( task.get('db-tables').indexOf( schema_table.name ) === -1 ){

              task.log('MISSING ' + schema_table.name +  ' TABLE');
              missing_schema_tables.push( schema_table );
            } 
          });

          task.set('missing-tables', missing_schema_tables);
          task.next();
        });

      // build missing tables
        task.step('build-missing-tables', function(){

          var constructed_tables, missing_tables, processed, each;

            missing_tables = task.get('missing-tables');
            each = require('./each');
            processed = 0;
            failures = 0;

          if(missing_tables.length === 0){ 

            task.log('no missing tables');
            task.next();
          }

          else {

            each(missing_tables, function(missing_table){

              self.ADD_TABLE(missing_table, function(error, result, log){

                if(error){

                  failures += 1;
                  task.log( log );
                  task.log( error );
                  task.log('ERROR WHILE CREATING ' + missing_table.name + ' TABLE');
                }

                else {

                  task.log('CREATED ' + missing_table.name + ' TABLE');
                }

                processed += 1;
                next_step_checker();
              })
            });
          }

          function next_step_checker(){

            if(processed < missing_tables.length) return;

            if(failures > 0) task.end( task.log() );

            else task.next();
          }
        })

      // get db table columns
        task.step('get-db-table-columns', function(){

          var tables, processed, failures, each;

            each = require('./each');
            processed = 0;
            failures = 0;
            tables = {};

          each(db_structure, function(table){

            self.query('SHOW COLUMNS FROM ' + table.name, function(error, result){

              if(error){

                failures += 1;
                task.log({message: 'COULD NOT GET COLUMNS FROM ' + table.name, error: error});
              }

              else{

                tables[table.name] = result;
              }

              processed += 1;
              next_step_checker();
            });

            function next_step_checker(){

              if(processed < db_structure.length) return;

              if(failures > 0) task.end( task.log() ); 

              else {
                task.log('successfully fetched table columns from production db');
                task.set('db-table-columns', tables);
                task.next();
              }
            }
          })
        });

      // confirm schema columns are in db
        task.step('confirm-schema-columns-exist-in-db', function(){

          var missing_columns, db_table_columns, each;

            each = require('./each');
            db_table_columns = task.get('db-table-columns');
            missing_columns = [];

          each(db_structure, function(table){

            each(table.columns, function(schema_column, index){

              var schema_column_exists = false;

              each( db_table_columns[table.name], function(db_column){

                var continue_loop = true;

                if(schema_column.name === db_column.Field){ 

                  schema_column_exists = true;
                  continue_loop = false;
                }
                
                return continue_loop;
              });

              if(!schema_column_exists){

                task.log('MISSING ' + schema_column.name + ' COLUMN FOR TABLE ' + table.name);
                missing_columns.push({table: table.name, column: schema_column});
              }                    
            });
          });
          
          task.set('missing-columns', missing_columns);
          task.next();
        });

      // build missing columns
        task.step('build-missing-columns', function(){

          var missing_columns, failures, processed, each;

            failures = 0;
            processed = 0;
            each = require('./each');
            missing_columns = task.get('missing-columns');

          if(missing_columns.length === 0){

            task.log('no columns missing from any tables')
            next_step_checker();
          } 

          else {

            each(missing_columns, function(data){

              self.ADD_COLUMN(data.column, data.table, function(error, result){
                
                if(error){

                  failures += 1;
                  task.log({message: 'COULD NOT CREATE COLUMN ' + data.column.name, error: error})
                }

                else {

                  task.log('CREATED ' + data.column.name + ' COLUMN FOR TABLE ' + data.table);
                }

                processed += 1;
                next_step_checker();
              });
            });
          }

          function next_step_checker(){

            if(processed < missing_columns.length) return;

            if(failures > 0) task.end( task.log() );

            else task.next();
          }
        }); 

      // get db table indexes
        task.step('get-db-table-indexes', function(){

          var tables, failures, processed;

            processed = 0;
            failures = 0;
            tables = {};

          require('./each')(db_structure, function(table){

            self.SHOW_INDEXES(table.name, function(error, indexes){

              if(error){

                failures += 1;

                task.log(error);
                task.log('couldn\'t get ' + table.name + '\'s indexes')
              }

              else{

                tables[table.name] = indexes;
              }

              processed += 1;
              next_step_checker();
            });
          });

          function next_step_checker(){

            if(processed < db_structure.length) return;

            if(failures > 0){

              task.end('FAILED TO GET ALL INDEXES FOR ' + table.name + ' TABLE');
            } 

            else {

              task.log('successfully fetched keys from production db table columns');
              task.set('db-table-indexes', tables);
              task.next();
            }
          }
        });

      // confirm schema indexes are in db
        task.step('confirm-schema-indexes-exist-in-db', function(){

          var each, requests, processed, failures, db_table_indexes;

            each = require('./each');

            db_table_indexes = task.get('db-table-indexes');
            
            missing_indexes = [];

          // create requests to update database indexes
            each(db_structure, function(table){

              // filter tables with no primary and no unique keys
                if(!table.primary_key && !table.unique_keys) return;

              // primary key
                if(table.primary_key){

                  var create_primary_index = true;
                  
                  each(db_table_indexes[table.name], function(table_index){

                    // filter non-primary indexes
                      if(table_index.Key_name !== 'PRIMARY'){

                        return;
                      }

                    create_primary_index = false;
                    return false;
                  });

                  if(create_primary_index){

                    task.log('MISSING ' + table.primary_key + '  PRIMARY KEY FOR ' + table.name + ' TABLE');

                    missing_indexes.push({

                      querystring: 'ALTER TABLE ' + self.escapeId( table.name ) + ' ADD PRIMARY KEY(' + self.escapeId( table.primary_key ) + ')', 
                      table: table.name,
                      key_type: 'primary',
                      key_schema: table.primary_key
                    });
                  }
                }

              // unique keys
                if(table.unique_keys){

                  each(table.unique_keys, function(unique_key, unique_key_index){

                    var create_unique_key, total_columns, found_columns;

                      total_columns = unique_key.columns.length;
                      found_columns = 0;

                      create_unique_key = true;

                    
                    each(db_table_indexes[table.name], function(table_index){

                      // filter non-unique indexes
                        if(table_index.Key_name !== unique_key.name){

                          return;
                        }

                      found_columns += 1;

                      if(found_columns === total_columns){

                        create_unique_key = false;
                        return false;
                      }
                    });

                    if(create_unique_key){
                 
                      task.log('MISSING ' + unique_key.name + ' KEY FOR ' + table.name + ' TABLE');

                      require('./each')( unique_key.columns, function( column, index ){

                        unique_key.columns[ index ] = self.escapeId( column );
                      });

                      missing_indexes.push({

                        querystring: 'ALTER TABLE ' + self.escapeId( table.name ) + ' ADD UNIQUE INDEX ' + self.escapeId( unique_key.name ) + ' (' + unique_key.columns.join(', ') + ')',
                        table: table.name,
                        key_type: 'unique',
                        key_schema: unique_key
                      });
                    }
                  });
                }
            });

          task.set('missing-indexes', missing_indexes);
          task.next();
        });
      
      // build missing indexes
        task.step('build-missing-indexes', function(){

          var missing_indexes = task.get('missing-indexes'),
              each = require('./each'),
              processed = 0,
              failures = 0;

          if( missing_indexes.length < 1 ){

            task.log('no missing indexes');
            return task.end();
          }

          each( missing_indexes, function( missing_index ){

            helpers.query( missing_index.querystring, function( error, success ){

              processed += 1;
                
              if(error){

                failures += 1;

                if( missing_index.key_type == 'primary' ){

                  task.log({message: 'COULD NOT CREATE PRIMARY KEY FOR ' + missing_index.table + ' TABLE', error: error})
                }

                else if( missing_index.key_type == 'unique' ){
                  
                  task.log({message: 'COULD NOT CREATE UNIQUE KEY ' + missing_index.key_schema.name + ' FOR ' + missing_index.table + ' TABLE', error: error})
                }
              }

              else {

                if( missing_index.key_type == 'primary' ){

                  task.log('CREATED PRIMARY KEY FOR ' + missing_index.table + ' TABLE')
                }

                else if( missing_index.key_type == 'unique' ){
                  
                  task.log('CREATED UNIQUE KEY ' + missing_index.key_schema.name + ' FOR ' + missing_index.table + ' TABLE')
                }
              }

              next_step_checker();
            });
          });

          function next_step_checker(){

            if(processed < missing_indexes.length) return;

            if(failures > 0) task.end( task.log() );

            else task.end();
          }
        });

    // START TASK
      task.start();
  }

  helpers.query = function(querystring, queryvars, callback){

    var no_queryvars = ( !callback && queryvars && typeof queryvars == "function" );

      if( no_queryvars ) callback = queryvars;

    var self, callback;

      self = this;
      callback = callback || default_callbacks.query;

    self.connect(
      
      function(err, open, close){

        if(err){

          callback(err, null);
        }

        else {

          if( no_queryvars ){
            
            open.query(querystring, function(error, result){

              close();

              callback(error, result);
            });
          }

          else {

            open.query(querystring, queryvars, function(error, result){

              close();

              callback(error, result);
            });
          }
        }
      }
    )
  }

  helpers.connect = function(callback){

    var connection = mysql.createConnection( mysql_url );
    var callback = callback || default_callbacks.connect;

    connection.on('error', function(err){

      log('MYSQL CONNECTION ERROR: CODE ' + err.code);
    });

    queue.push({

      'connection': connection,
      'callback': callback
    });

    process_queue();     
  }

  helpers.escape = mysql.escape;
  helpers.escapeId = mysql.escapeId;

  function process_queue(){

    var each = require('./each');

    each(queue, function(){

      if(open_connections === queue_concurrency){ return false; }

      var item = queue.shift();

      open_connections += 1;
      
      item.connection.connect(function(err){

        var open, close;

        if(err){

          open_connections -= 1;
          return;
        } 

        open = item.connection;
        close = function(){

          item.connection.end(function(){

            open_connections -= 1;

            if(queue.length > 0 && queue_concurrency > open_connections ){

              process_queue();
            }
          });
        }

        item.callback(err, open, close);
      });
    });
  }

  return helpers;
}