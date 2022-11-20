const util = require('util');
const events = require('events');

var Adaptor = function (structure, config) {
    this.structure = structure;
    this.mqtt_prefix = config.options.mqtt_prefix;

    if (this.mqtt_prefix === undefined) {
        this.mqtt_prefix = 'lox';
    }

    this.icon_path =  config.options.icon_path;

    this.path2control = {};
    this.stateuuid2path = {};
    this.ispushbutton = {};
    this.mqtt_structure = {};

    this._build_paths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.set_value_for_uuid = function(uuid, value) {
    this.structure.set_value_for_uuid(uuid, value);
    if (this.stateuuid2path[uuid])
      this.emit('for_mqtt', this.stateuuid2path[uuid], value, this.ispushbutton[uuid]!=true);
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

Adaptor.prototype.publish_mqtt_structure = function() {
    let device_info = this.structure.msInfo.serialNr;
    let categories = Object.values(this.structure.categories.items);
    let rooms = Object.values(this.structure.rooms.items);
    let controls = Object.values(this.structure.controls.items);

    categories.sort((a, b) => { return a.name.localeCompare(b.name); }) // sort A-Z
    rooms.sort((a, b) => { return a.name.localeCompare(b.name); }) // sort A-Z
    controls.sort((a, b) => { return a.name.localeCompare(b.name); }) // sort A-Z

    this.mqtt_structure.categories = [];
    this.mqtt_structure.rooms = [];
    this.mqtt_structure.controls = [];

    categories.forEach((category) => {
        this.mqtt_structure.categories.push(
        {
            hwid: device_info,
            uuid: category.uuid,
            name: category.name,
            type: category.type,
            icon: { href: this.icon_path + '/' + category.image },
            is_favorite: category.isFavorite,
            is_visible: true,
            is_protected: category.isSecured,
            order: category.name.toLowerCase().charCodeAt(0)-96
        });
    });

    rooms.forEach((room) => {
        let id = device_info + '-' + room.uuid;
        this.mqtt_structure.rooms.push(
        {
            hwid: device_info,
            uuid: room.uuid,
            name: room.name,
            type: room.type,
            icon: {
                href: this.icon_path  + '/' + room.image,
                color: room.color
            },
            is_favorite: room.isFavorite,
            is_visible: true,
            is_protected: room.isSecured,
            order: room.name.toLowerCase().charCodeAt(0)-96
        });
    });

    controls.forEach((control, index) => {
        if (control.defaultIcon != null) {
            icon = this.icon_path + '/' + control.defaultIcon;
            if (icon.search(".svg") == -1) // ext not found
              icon = icon + ".svg";
        }
        else // take icon from category
            icon = this.mqtt_structure.categories.find(element => element.uuid === control.category).icon.href;

        let states = {};
        if (control.states !== undefined)
          Object.keys(control.states.items).forEach( function(key) { states[camelToSnake(key)] = "" } );

        let details = {};
        if (control.details !== undefined)
          Object.keys(control.details).forEach( function(key) { details[camelToSnake(key)] = control.details[key] } );

        this.mqtt_structure.controls.push(
        {
            hwid: device_info,
            uuid: control.uuidAction,
            name: control.name,
            defaultIcon: control.defaultIcon,
            icon: { href: icon },
            type: camelToSnake(control.type),
            room: control.room,
            category: control.category,
            is_favorite: false,
            is_visible: true,
            is_protected: control.isSecured,
            details: details,
            states: states,
            order: control.name.toLowerCase().charCodeAt(0)-96
        });
    });

    this.emit('for_mqtt', this.mqtt_prefix + '/structure', JSON.stringify(this.mqtt_structure), true);
}

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

    if (control.type === "Pushbutton") this.ispushbutton[control_uuid] = true;

    if (control.states !== undefined){
        Object.keys(control.states.items).forEach(function(key) {
            let that = this;
            let uuid = control.states.items[key].uuid;
            if (Array.isArray(uuid)) {
              Object.keys(uuid).forEach(function(index) {
                that.stateuuid2path[uuid[index]] = path + '/states/' + camelToSnake(key) + '/' + index;
              });
            } else {
                that.stateuuid2path[uuid] = path + '/states/' + camelToSnake(key);
            }
        }, this);
    }
}

function camelToSnake(str) {
    let s = str[0].toLowerCase() + str.slice(1);
    return s.replace(/[A-Z]/g, (c) => {return '_' + c.toLowerCase()});
}

module.exports = Adaptor;
