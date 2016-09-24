module.exports = function( noticeboard ){
  
  noticeboard.watch( 'pull-request-event', 'parse-event', function( msg ){

    var pullrequest = msg.notice;

    switch( pullrequest.state ){

      case 'OPEN':

        noticeboard.notify( 'pull-request-created', pullrequest, 'parse-pull-request-event' );

        noticeboard.log( 
          '- pull request created by ' + pullrequest.author.display_name + ' -\n',
          'id: ' + pullrequest.id + '\n',
          'src:\n', pullrequest.source, ' \n',
          'dest:\n', pullrequest.destination
        );

      break;

      case 'MERGED':

        noticeboard.log( '- pull request #' + pullrequest.id + ' merged -' );

      break;

      case 'DECLINED':

        noticeboard.log( '- pull request #' + pullrequest.id + ' declined -' );

      break;

      default:

        noticeboard.log( 
          '- unknown pull request event -\n',
          'event:\n',
          pullrequest
        );

      break;
    }
  })
}