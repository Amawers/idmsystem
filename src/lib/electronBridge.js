const safeBridge = typeof window !== "undefined" && window.electronAPI
	? window.electronAPI
	: {
		getAppVersion: async () => "web",
	};

export default safeBridge;
