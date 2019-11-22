const bestzip = require("bestzip");
// const unzip = require("unzip");

bestzip({
    source: 'test/*',
    destination: './destination.zip'
  }).then(function() {
    console.log('all done!');
  }).catch(function(err) {
    console.error(err.stack);
    // process.exit(1);
  });``