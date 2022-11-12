const util = require('util');
const events = require('events');

var Adaptor = function (structure, mqtt_prefix) {
    this.structure = structure;
    this.mqtt_prefix = mqtt_prefix;

    if (this.mqtt_prefix === undefined) {
        this.mqtt_prefix = 'lox';
    }

    this.path2control = {};
    this.stateuuid2path = {};

    this._build_paths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.set_value_for_uuid = function(uuid, value) {
    this.structure.set_value_for_uuid(uuid, value);
    if (this.stateuuid2path[uuid])
      this.emit('for_mqtt', this.stateuuid2path[uuid], String(value) );
};

Adaptor.prototype.get_command_from_topic = function(topic, data) {
    var path_groups = topic.match('^(.+)/cmd$');
    if (!path_groups){
        return {};
    }
    var control = this.path2control[path_groups[1]];
    if (!control){
        return {};
    }
    return {
        'uuidAction': control.uuidAction,
        'command': data
    };
};

Adaptor.prototype.get_topic_for_subscription = function() {
    // topic: mqtt_prefix/serialnr/uuid/cmd
    return this.mqtt_prefix + '/+/+/cmd'
};

Adaptor.prototype.abort = function() {
    this.structure.removeAllListeners();
    this.structure = undefined;
    this.removeAllListeners();
};

Adaptor.prototype._build_paths = function() {
    Object.keys(this.structure.controls.items).forEach(function(key){
        var control = this.structure.controls.items[key];
        this._add_control(control);
        if (control.subControls !== undefined){
            Object.keys(control.subControls.items).forEach(function(sub_key){
                this._add_control(control.subControls.items[sub_key]);
            }, this);
        }
    }, this);

    this.path2control['globalstates'] = this.structure.globalStates;
    Object.keys(this.structure.globalStates).forEach(function(key){
        this.stateuuid2path[this.structure.globalStates[key].uuid] = 'globalstates/' + key;
    }, this);
};

Adaptor.prototype._add_control = function(control){
    var control_uuid = control.uuidAction;
    var serialnr = this.structure.msInfo.serialNr;

    var path = this.mqtt_prefix + '/' + serialnr + '/' + control_uuid;
    this.path2control[path] = control;

    if (control.states !== undefined){
        Object.keys(control.states.items).forEach(function(key) {
            let that = this;
            let uuid = control.states.items[key].uuid;
            if (Array.isArray(uuid)) {
              Object.keys(uuid).forEach(function(index) {
                that.stateuuid2path[uuid[index]] = path + '/states/' + key + '/' + index;
              });
            } else {
                that.stateuuid2path[uuid] = path + '/states/' + key;
            }
        }, this);
    }
}

module.exports = Adaptor;
