const { registerSettingsIpc } = require('./settings-ipc');
const { registerWindowIpc } = require('./window-ipc');
const { registerPlaybackIpc } = require('./playback-ipc');
const { registerIntegrationsIpc } = require('./integrations-ipc');

class IpcHub {
  constructor() {
    this.context = null;
    this.initialized = false;
  }

  init(context) {
    if (this.initialized) return;
    this.context = context;

    registerSettingsIpc(this.context);
    registerWindowIpc(this.context);
    registerPlaybackIpc(this.context);
    registerIntegrationsIpc(this.context);

    this.initialized = true;
    console.log('[IpcHub] All IPC channels registered successfully.');
  }
}

module.exports = new IpcHub();
