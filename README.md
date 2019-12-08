
## Installation

1. Download and install [NodeJS](https://nodejs.org/)
2. Install Nodemon for auto restart script. [Nodemon](https://www.npmjs.com/package/nodemon)
  ```bash
  $ sudo npm install -g nodemon
  ```
3. To install dependencies, in folder with "index.js" run: 
  ```bash
  $ npm install
  ```
4. To start the server run the command:
  ```bash
  $ nodemon
  ```


## Features

- [x] Sending a pre-prepared server response from a json file
- [x] Sending response headers from configuration files for each request
- [x] Sending a statusCode of the response from the configuration files for each query
- [x] It is possible to send static data, such as pictures
- [x] Forward requests to the real server if necessary

## Configuration

The server automatically starts on port 4000. You can change this behavior. by changing the port number in the script.

After the launch, you can check the work by opening the address in the browser:
  ```bash
  http://localhost:4000/
  ```
The sites folder contains the folder structure and configuration files for generating the server response.

The folder structure is the same as the query structure. Except that the first level indicates the name of the method by which the server is accessed. The following methods are supported: GET, POST, PUT, PATCH, delete.

For example, folder structure:
  ```bash
  $ ./sites/post/level1/level2/answer.json 
  ```
Corresponds to the request:
  ```bash
  http://localhost:4000/level1/level2/
  ```

If you need to pass query parameters in the query, you will need to create a subfolder starting with a question mark. To work in Linux, this sign can be replaced by any other directly in the script. For example:
  ```text
  ./sites/post/level1/?k1=2&k2=1000/answer.json 
  http://localhost:4000/level1/?k1=2&k2=1000
  ```

The destination folder may contain a config config.json. In this file you can specify the list of headers that the server should return and the statusCode of the server response. For example:

  ```json
    {
        "statusCode": 500,
        "headers":{
            "Content-Type": "application/json",
            "hello":"world",
            "Cookie": ["type=ninja", "language=javascript"]
        }
    }
  ```

The header list may contain "redirect" field. In this case, the request will be redirected to the url specified in this field. For example:
```text
    redirect: yandex.ru
  ```

You have the ability to place static data on the server, such as pictures and get access to them. To do this, copy the files to the "static" folder. They will be available at the link, for example:
  ```text
  http://localhost:4000/original.jpeg
  ```


## License

Responder is released under the MIT license. 
