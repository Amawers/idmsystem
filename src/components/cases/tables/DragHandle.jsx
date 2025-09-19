// Icons
import { IconGripVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";

// ====================
// Drag handle component (grip icon for rows)
// ====================
export default function DragHandle({ id }) {
	// useSortable hook binds the drag listeners & attributes
	// `id` is the unique identifier for the draggable item
	const { attributes, listeners } = useSortable({
		id,
	});

	return (
		<Button
			// Spread dnd-kit props so the button can act as drag handle
			{...attributes}
			{...listeners}
			variant="ghost"
			size="icon"
			className="text-muted-foreground size-7 hover:bg-transparent"
		>
			{/* Grip icon (vertical dots) as visual drag handle */}
			<IconGripVertical className="text-muted-foreground size-3" />
			
			{/* Screen reader text for accessibility */}
			<span className="sr-only">Drag to reorder</span>
		</Button>
	);
}
