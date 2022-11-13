# node-lox-mqtt-gateway

Gateway for the Loxone Miniserver to communicate over MQTT. The gateway connects to the Loxone Miniserver websocket and an MQTT broker (e.g. LoxBerry)

_NOTE: The MQTT Topic API of this version differs from the upstream repository. In this version, all Miniserver state changes are immediately relayed to MQTT using their uuid._

**This is an experimental version. Use it at your own risk.**

## Setup

```bash
git clone https://github.com/nufke/node-lox-mqtt-gateway.git
cd node-lox-mqtt-gateway
npm i
```

## Configuration

### Logging settings (winston)

It contains array of transports with its options.

```json
{
    "winston": [{
        "Console": {
            "level": "debug"
        },
        "File": {
            "level": "info",
            "filename": "somefile.log"
        }
    }]
}
```

### MQTT settings

This section contains the options for [MQTT](https://github.com/mqttjs/MQTT.js):

```json
{
    "mqtt": {
        "host": "mqtt://localhost:1883",
        "options": {
            "username": "test",
            "password": "test1234"
        }
    }
}
```

### Loxone Miniserver settings

This section contains the contains the options for the Loxone Miniserver:

* **host** - Miniserver hostname address and port (hostname:port)
* **username** - Credentials for Miniserver
* **password**
* **readonly** - if it's set to true then no commands will be send to Miniserver - it's for testing and development
* **encrypted** - use AES-256-CBC encrypted web sockets
* **mqtt_prefix** - Topic prefix for Loxone™ messages

```json
{
    "miniserver": {
        "host": "192.168.0.77:80",
        "username": "testlox",
        "password": "1234",
        "readonly": false,
        "encrypted": true,
        "mqtt_prefix": "lox"
    }
}
```

### Configuration file example

All settings can be added to a single configuation file. An example can be found in `./config/default.json`:

```json
{
    "winston": [{
        "Console": {
            "level": "debug",
            "colorize": true,
            "timestamp": true
        }
    }],
    "mqtt": {
        "host": "mqtts://localhost:8883",
        "options": {
            "rejectUnauthorized": false,
            "username": "test",
            "password": "test1234",
            "clientId": "lox_to_mqtt_gateway"
        }
    },
    "miniserver": {
        "host": "192.168.0.77:80",
        "username": "testlox",
        "password": "1234",
        "readonly": false,
        "mqtt_prefix": "lox"
    }
}
```

## Start Gateway

To start the gateway using the `default.json` located in `./config/`

```bash
node lox-mqtt-gateway --NODE_CONFIG_DIR='config'
```

## MQTT Topic API

### Receiving state changes of the Loxone Miniserver and broadcast them to MQTT

To receive actual states of controls and other elements, you need to subscribe to the following topic:

```
<mqtt_prefix>/<serialnr>/<uuid>/states/#
```

The `serialnr` of your Miniserver and the `uuid` of the control or state can be found in the Loxone structure file `LoxAPP3.json` on your Miniserver.

**Example of incoming state change**

```
lox/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc/states/active 1
```

Where `lox` is the MQTT prefix, `0123456789AB` is the Miniserver serial nr., `01234567-abcd-0123-ffffeeeeddddcccc` the uuid of a control, `state/active` the current state of the control (a switch in this example) and `1` the received value.

### Sending MQTT control messages to the Loxone Miniserver

To control the Loxone Miniserver, you should send messages to the following MQTT topic:

```
<mqtt_prefix>/<serialnr>/<uuid>/cmd
```

**Example**

```
lox/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc/cmd off
```

In this example, a switch on Miniserver `0123456789AB` with uuid `01234567-abcd-0123-ffffeeeeddddcccc` is switched off.
