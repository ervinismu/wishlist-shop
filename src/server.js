// Starts the web server. Settings come from environment variables:
//   PORT       port to listen on (default 3000)
//   DATA_FILE  where the wishlist is saved (default data/db.json)

import { createServer } from 'node:http';

import { createApp } from './app.js';
import { createStore } from './store.js';

const port = Number(process.env.PORT ?? 3000);
const store = createStore({ file: process.env.DATA_FILE ?? 'data/db.json' });

createServer(createApp({ store })).listen(port, () => {
  console.log(`Wishlist Shop running at http://localhost:${port}`);
});
