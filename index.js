var instance_skel = require('../../instance_skel')
var rest_client = require('node-rest-client').Client
var log

function instance(system, id, config) {
	var self = this

	instance_skel.apply(this, arguments)
	self.actions()

	return self
}

instance.prototype.init = function () {
	var self = this

	self.status(self.STATE_UNKNOWN)
	self.currentIndex = 0
	log = self.log

	self.client = new rest_client()
	self.client.on('error', function (err) {
		self.status(self.STATE_ERROR)
		self.log('error', 'Error in SmartCaster API call: ' + err.message)
	})

	self.init_variables()
	self.actions()
}

instance.prototype.destroy = function () {
	var self = this
	// Nothing to do
}

instance.prototype.config_fields = function () {
	var self = this
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module allows control of SAT Plus SmartCaster video player',
		},
		{
			type: 'textinput',
			id: 'baseurl',
			label: 'Base URL to SmartCaster API. Example http://1.2.3.4:9000/',
			width: 12,
			required: true,
		},
	]
}

instance.prototype.updateConfig = function (config) {
	var self = this

	self.config = config
	self.updateState()
}

instance.prototype.init_variables = function () {
	var self = this
	var variables = [
		{
			label: 'Currently playing item #',
			name: 'index',
		},
		{
			label: 'Play position (current item, seconds)',
			name: 'played',
		},
		{
			label: 'Play duration (current item, seconds)',
			name: 'duration',
		},
		{
			label: 'Path to current item',
			name: 'path',
		},
		{
			label: 'Current item Title (metadata)',
			name: 'title',
		},
		{
			label: 'Current item Block Title (metadata)',
			name: 'blocktitle',
		},
	]
	self.updateState()
	self.setVariableDefinitions(variables)
}

instance.prototype.updateState = function () {
	var self = this
	self.client.get(self.config.baseurl + '/api/status', function (data, response) {
		self.setVariable('index', data['Index'])
		self.currentIndex = data['Index']
		self.setVariable('played', data['Played'])
		self.setVariable('duration', data['Duration'])
		self.status(self.STATE_OK)
	})
	self.client.get(self.config.baseurl + '/api/playlist/currentitem', function (data, response) {
		self.setVariable('path', data['Path'])
		self.setVariable('title', data['Metadata']['TITLE'])
		self.setVariable('blocktitle', data['Metadata']['BLOCKTITLE'])
	})
}

instance.prototype.actions = function (system) {
	var self = this

	self.setActions({
		next: {
			label: 'Play next item',
		},
		pause: {
			label: 'Pause playback',
		},
		resume: {
			label: 'Resume playback',
		},
		cue: {
			label: 'Cue item (absolute)',
			options: [
				{
					type: 'textinput',
					label: 'Item number',
					id: 'index',
					default: '1',
				},
			],
		},
		jumpto: {
			label: 'Jump to item (absolute)',
			options: [
				{
					type: 'textinput',
					label: 'Item number',
					id: 'index',
					default: '1',
				},
			],
		},
		jumprel: {
			label: 'Jump to item (relative)',
			options: [
				{
					type: 'textinput',
					label: 'Item number added to the current position',
					id: 'index',
					default: '1',
				},
			],
		},
		'sc-command': {
			label: 'Smartcaster command',
			options: [
				{
					type: 'textinput',
					label: 'Raw command for SmartCaster',
					id: 'cmd',
					default: 'LOGO ON DEMO',
				},
			],
		},
		'caspar-command': {
			label: 'CasparCG ACMP command',
			options: [
				{
					type: 'textinput',
					label: 'Raw command for CasparCG',
					id: 'cmd',
					default: 'PLAY 1-10 LOGO LOOP',
				},
			],
		},
		'reset-input': {
			label: 'Reset video INPUT',
		},
		'reset-output': {
			label: 'Reset video OUTPUT',
		},
		'reset-server': {
			label: 'Reset CasparCG Server',
		},
		'reset-channel': {
			label: 'Reset channel',
		},
	})
}

instance.prototype.apicall = function (method, path) {
	var self = this
	fn = null
	switch (method) {
		case 'POST':
			fn = self.client.post
			break
		case 'GET':
			fn = self.client.get
			break
		default:
			self.log('error', 'Unknown API method ' + method)
			return
	}

	fn(self.config.baseurl + '/api/' + path, {}, function (data, response) {
		// console.log(data)
	})
}

instance.prototype.action = function (action) {
	var self = this
	const opt = action.options

	switch (action.action) {
		case 'reset-input':
			self.apicall('POST', 'system/reset/input')
			break
		case 'reset-output':
			self.apicall('POST', 'system/reset/output')
			break
		case 'reset-server':
			self.apicall('POST', 'system/reset/server')
			break
		case 'reset-channel':
			self.apicall('POST', 'system/reset/channel')
			break
		case 'next':
			self.apicall('POST', 'control/next')
			break
		case 'pause':
			self.apicall('POST', 'control/pause')
			break
		case 'resume':
			self.apicall('POST', 'control/resume')
			break
		case 'jumpto':
			self.apicall('POST', 'control/jumpto/' + opt['index'])
			break
		case 'jumprel':
			self.updateState()
			var newitem = self.currentIndex + parseInt(opt['index'])
			self.apicall('POST', 'control/jumpto/' + newitem)
			break
		case 'cue':
			self.apicall('POST', 'control/cue/' + opt['index'])
			break
		case 'sc-command':
			self.apicall('GET', 'control?command=' + encodeURI(opt['cmd']))
			break
		case 'caspar-command':
			self.apicall('GET', 'caspar/amcp?command=' + encodeURI(opt['cmd']))
			break
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
