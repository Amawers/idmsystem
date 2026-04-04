import { useInventoryManager } from "@/hooks/useInventoryManager";

export function useInventory(options = {}) {
	const manager = useInventoryManager(options);

	return {
		...manager,
		refresh: manager.refreshInventory,
	};
}

export default useInventory;
