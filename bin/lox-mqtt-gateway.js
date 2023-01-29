#!/usr/bin/env node

const lox_mqtt_gateway = require('../lib/index.js');
const http = require('http');

if (!process.env.NODE_CONFIG_DIR) {
    process.env.NODE_CONFIG_DIR = __dirname + "/../config/";
}
var config = require("config");

if (config.has('publish_options')) {
    var pubopts = config.get('publish_options');
}
var logger = lox_mqtt_gateway.Logger(config.get('winston'));
var app = new lox_mqtt_gateway.App(logger);
var mqtt_client = lox_mqtt_gateway.mqtt_builder(config.get('mqtt'), app);
var lox_client = lox_mqtt_gateway.WebSocketAPI(config.get('miniserver'), app);
var lox_mqtt_adaptor = undefined;

app.on('exit', function (code) {
    if (lox_mqtt_adaptor) {
        lox_mqtt_adaptor.abort();
    }
});

function _update_event(uuid, value) {
    if (lox_mqtt_adaptor) {
        lox_mqtt_adaptor.set_value_for_uuid(uuid, value);
    }
};

lox_client.on('update_event_text', _update_event);
lox_client.on('update_event_value', _update_event);

lox_client.on('get_structure_file', function (data) {
    if (lox_mqtt_adaptor) {
        lox_mqtt_adaptor.abort();
    }

    lox_mqtt_adaptor = new lox_mqtt_gateway.Adaptor(lox_mqtt_gateway.Structure.create_from_json(data,
        function (value) {
            logger.warn("MQTT Structure - invalid type of control", value);
        }
    ));

    mqtt_client.subscribe(lox_mqtt_adaptor.get_topics_for_subscription());

    lox_mqtt_adaptor.on('for_mqtt', function (topic, data, retain_) {
        let payload = String(data);
        let options = { retain: retain_ };
        logger.debug("MQTT Adaptor - for mqtt: ", { topic: topic, data: payload });
        var fixedTopicName = topic.replace("+", "_").replace("#", "_")
        mqtt_client.publish(fixedTopicName, payload, options);
    });

    if (config.loxberrypwa.publish_structure)
        lox_mqtt_adaptor.publish_mqtt_structure();
});

mqtt_client.on('connect', function (conack) {
    if (!lox_client.is_connected()) {
        lox_client.connect();
    }
});

mqtt_client.on('message', function (topic, message, packet) {
    if (!lox_mqtt_adaptor) {
        return;
    }
    var action = lox_mqtt_adaptor.get_command_from_topic(topic, message.toString());

    if (config.miniserver.readonly) {
        app.logger.debug("MQTT Adaptor - readonly mode");
        return;
    }

    if (action.protocol === 'ws') {
        lox_client.send_cmd(action.uuidAction, action.command);
        app.logger.debug("MQTT Adaptor - for miniserver: ", { uuidAction: action.uuidAction, command: action.command });
        return;
    }

    if (action.protocol === 'http') {
        var url = 'http://' + config.miniserver.username + ':' + config.miniserver.password +
            '@' + config.miniserver.host + '/jdev/sps/io/' + action.name + '/' + action.command;

        http.get(url, resp => {
            app.logger.debug("MQTT Adaptor - for miniserver: ", url);
        })
        .on('error', err => {
            app.logger.error("MQTT Adaptor - HTTP error: " + err.message);
        })
        return;
    }
});
