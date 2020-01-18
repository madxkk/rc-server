const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const getSlaves = (slaves) => {
  const obj = [];

  slaves.forEach((sl) => {
    obj.push(sl.client.id);
  });

  return obj;
};

const slaves = [];
const masters = [];
const global = {
  locked: [],
};

app.get('/', (req, res) => {
  res.send('<h1>RC API</h1>');
});

const slave = io
  .of('/slave')
  .on('connection', (socket) => {
    slaves.push(socket);
    console.log(socket);
    master.emit('slaves', getSlaves(slaves));

    socket.on('disconnect', () => {
      console.log('Slave gone');
      slaves.splice(slaves.indexOf(socket), 1);
      master.emit('slaves', getSlaves(slaves));
    });

    console.log('New slave');
  });

const master = io
  .of('/master')
  .on('connection', (socket) => {
    masters.push(socket);

    socket.on('disconnect', () => {
      console.log('Master gone');

      global.locked.forEach((el, i) => {
        if (el.master === socket.client.id) {
          global.locked.splice(i, 1);
        }
        console.log(global.locked);
      });

      masters.splice(masters.indexOf(socket), 1);
    })

    socket.on('update', (event) => {
      if (event) {
        if (event.type === 'selectslave') {
          if (event.data.slaveid) {
            slaves.forEach((sl) => {
              if (sl.client.id === event.data.slaveid) {
                global.locked.forEach((el, i) => {
                  if (el.master === socket.client.id) {
                    global.locked.splice(i, 1);
                  }
                });
                global.locked.push({master: socket.client.id, slave: sl.client.id});
              }
            });
          }
          return true;
        } else {
          const curr = global.locked.filter((el) => el.master === socket.client.id);
          slaves.forEach((sl) => {
            if (curr && curr[0] && sl.client.id === curr[0].slave) {
              sl.emit('update', event);
            }
          });
        }
      }
    });

    socket.emit('slaves', getSlaves(slaves));
  });

http.listen(30000, () => {
  console.log('Listening on [::]:30000');
});
