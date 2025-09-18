import React from "react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export default function TestFileGenerator() {
	const generateDoc = async () => {
		// 1. Load template
		const templateUrl = "/template.docx";
		const content = await fetch(templateUrl).then((res) =>
			res.arrayBuffer()
		);

		// 2. Load into Docxtemplater
		const zip = new PizZip(content);
		const doc = new Docxtemplater(zip, {
			paragraphLoop: true,
			linebreaks: true,
		});

		// 3. Provide data
		const dataObj = {
			row1: {
				name: "Bossing wapo",
				email: "boss1@example.com",
				address: "Davao City",
			},
			row2: {
				name: "Assistant wapo",
				email: "assistant@example.com",
				address: "Cebu City",
			},
		};

		// Convert to array
		const rows = Object.values(dataObj);

		const data = { rows };

		doc.render(data);

		// 4. Generate and download
		const output = doc.getZip().generate({ type: "blob" });
		saveAs(output, "GeneratedDocument.docx");
	};

	return (
		<div>
			<button
				onClick={generateDoc}
				className="bg-blue-500 text-white px-4 py-2 rounded"
			>
				Generate Document
			</button>
		</div>
	);
}
