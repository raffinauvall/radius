import { server } from './server.js';

server.listen(Number(process.env.PORT || 3000), '0.0.0.0');
