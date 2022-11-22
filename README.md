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

### Logging settings

The [winston](https://github.com/winstonjs/winston) logger is used to support different logging capabilities.

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

* **host** - Hostname address and port for the MQTT broker
* **username** - Credentials for the MQTT broker
* **password**
* **mqtt_prefix_lox** - MQTT topic prefix for Loxone messages
* **mqtt_prefix_app** - MQTT topic prefix for LoxBerry App messages
* **icon_path** - Path where application-specific or custom SVG icons are (publicly) accessible


```json
{
    "mqtt": {
        "host": "mqtt://localhost:1883",
        "options": {
            "username": "test",
            "password": "test1234",
            "mqtt_prefix_lox": "loxone",
            "mqtt_prefix_app": "loxberry/app",
            "icon_path": "/assets/svg_icons"
        }
    }
}
```

### Loxone Miniserver settings

This section contains the options for the Loxone Miniserver:

* **host** - Miniserver hostname address and port (hostname:port)
* **username** - Credentials for the Loxone Miniserver
* **password**
* **readonly** - if it's set to true then no commands will be send to Miniserver - it's for testing and development
* **encrypted** - use AES-256-CBC encrypted web sockets

```json
{
    "miniserver": {
        "host": "192.168.0.77:80",
        "username": "testlox",
        "password": "1234",
        "readonly": false,
        "encrypted": true
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
            "username": "test",
            "password": "test1234",
            "mqtt_prefix_lox": "loxone",
            "mqtt_prefix_app": "loxberry/app",
            "icon_path": "/assets/svg_icons"
        }
    },
    "miniserver": {
        "host": "192.168.0.77:80",
        "username": "testlox",
        "password": "1234",
        "readonly": false,
        "encrypted": true
    }
}
```

## Start Gateway

To start the gateway using the `default.json` located in `./config/`

```bash
node lox-mqtt-gateway --NODE_CONFIG_DIR='config'
```

## MQTT Topic API

### Broadcast the control structure over MQTT

When starting the gateway, the first message published over MQTT is the structure of the available controls, categories and rooms extracted from the Loxone Miniserver. To receive this structure, a client (e.g., [loxberrypwa](https://github.com/nufke/loxberrypwa) needs to subscribe to the following topic:

```
<mqtt_prefix_app>/structure
```

*NOTE: This structure is **not identical** to the Loxone structure, but looks simiar since the same information is shared over MQTT. A different structure has been created to integrated with other non-Loxone devices over MQTT.*

### Broadcasting a Loxone state change over MQTT

To receive actual states of controls and other elements, you need to subscribe to the following topic:

```
<mqtt_prefix_lox>/<serialnr>/<uuid>/#
```

The topic prefix `<mqtt_prefix_lox>` will subscribe to messages coming from a Loxone Miniserver, with `serialnr` and the `uuid` of a state, as can be found in the Loxone structure file `LoxAPP3.json` on your Miniserver.

**Example**

```
loxone/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc 1
```

Where `loxone` is the MQTT prefix, `0123456789AB` is the Miniserver serial nr., and `01234567-abcd-0123-ffffeeeeddddcccc` the uuid of one of the state fields in a control, and `1` the received value.

### Sending MQTT control messages to the Loxone Miniserver

To control the Loxone Miniserver, you should send messages to the following MQTT topic:

```
<mqtt_prefix_lox>/<serialnr>/<control-uuid>/cmd
```

**Example**

```
loxone/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc/cmd off
```

In this example, a switch on Miniserver `0123456789AB` with uuid `01234567-abcd-0123-ffffeeeeddddcccc` is switched off.
