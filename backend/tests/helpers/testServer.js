const request = require('supertest');
const app = require('../../src/app');

class TestServer {
  constructor() {
    this.app = app;
    this.server = null;
  }

  async start(port = 8889) {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }

  getRequest() {
    return request(this.app);
  }
}

module.exports = TestServer;