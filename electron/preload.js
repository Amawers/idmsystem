const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	getAppVersion: () => ipcRenderer.invoke("app:get-version"),
	reloadWindow: () => ipcRenderer.invoke("app:reload-window"),
});
