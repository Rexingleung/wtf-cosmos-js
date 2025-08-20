const {createServer} = require('./server.js')
const config = require('./config');

const server = createServer();

server.listen(config.PORT, () => {
	console.log('listen ' + config.PORT);
	
})
