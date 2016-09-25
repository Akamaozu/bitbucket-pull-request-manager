// ITERATOR
module.exports = function(container, processor){

  if(!container || !processor){ throw new Error( (!container ? 'DATA CONTAINER' : 'PROCESSOR' ) + ' NOT SUPPLIED'); }
  if(typeof processor !== 'function'){ throw new Error('PROCESSOR IS NOT A FUNCTION'); }
  
  var container_type, continue_loop, key; 
    container_type = Object.prototype.toString.call( container );

  switch( container_type ){

    case '[object Array]': 

      array_each(container);

    break;

    case '[object Object]':
    default:

      object_each(container);

    break;
  }

  function array_each(array){
  
    for (key = 0; key < array.length; key++) {
      
      continue_loop = processor(array[key], key);

      if(continue_loop === false) break;
    }
  }

  function object_each(object){

        for(key in object){

          if( !object.hasOwnProperty(key) ) continue;

          continue_loop = processor(object[key], key);

          if(continue_loop === false) break;
        }
  }
}