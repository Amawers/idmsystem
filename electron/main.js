/* eslint-env node */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	app,
	BrowserWindow,
	ipcMain,
	nativeTheme,
	shell,
} from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const devServerURL = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";

const createMainWindow = () => {
	const window = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 1024,
		minHeight: 700,
		show: false,
		autoHideMenuBar: true,
		backgroundColor: nativeTheme.shouldUseDarkColors ? "#0c0c0c" : "#ffffff",
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	window.once("ready-to-show", () => {
		window.show();
	});

	if (isDev) {
		window.loadURL(devServerURL);
		window.webContents.openDevTools({ mode: "detach" });
	} else {
		const indexHtml = path.join(app.getAppPath(), "dist", "index.html");
		window.loadFile(indexHtml);
	}

	window.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	return window;
};

app.setAppUserModelId("com.idmsystem.desktop");

app.whenReady().then(() => {
	createMainWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createMainWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

ipcMain.handle("app:get-version", () => app.getVersion());