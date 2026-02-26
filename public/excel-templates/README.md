# Excel Templates

Place case export Excel templates in this folder.

Current supported template:

- `sp-case-template.xlsx` → used by Single Parent (`SP`) record export.

## Best setup (recommended)

Use a fillable Excel template with **Named Ranges** for each value.

Create named ranges (Formulas → Name Manager) with these names:

- `FULL_NAME`
- `AGE`
- `ADDRESS`
- `BIRTH_DATE`
- `STATUS`
- `EDUCATIONAL_ATTAINMENT`
- `OCCUPATION`
- `MONTHLY_INCOME`
- `RELIGION`
- `INTERVIEW_DATE`
- `YEAR_MEMBER`
- `SKILLS`
- `SOLO_PARENT_DURATION`
- `FOUR_PS`
- `PARENTS_WHEREABOUTS`
- `BACKGROUND_INFORMATION`
- `ASSESSMENT`
- `CONTACT_NUMBER`
- `EMERGENCY_CONTACT_PERSON`
- `EMERGENCY_CONTACT_NUMBER`

## Notes

- If a name exists multiple times, all mapped ranges are filled.
- Date values are written in `MM-DD-YYYY` text format.
- Export output filename format: `single-parent-<record-id>-export.xlsx`.

## Google Sheets workflow (easy)

If you are designing in Google Sheets, you can skip Named Ranges and use inline placeholders in cells.

Example cell values:

- `Name: {{FULL_NAME}}`
- `Age: {{AGE}}`
- `Address: {{ADDRESS}}`

Then:

1. File → Download → Microsoft Excel (`.xlsx`)
2. Save it as `public/excel-templates/sp-case-template.xlsx`
3. Use **Export Excel** from the app

The exporter will replace `{{FIELD_NAME}}` tokens directly in cell text.

## Family composition table setup

The exporter supports up to **15 family members** per SP record.

For each row, use these field names:

- `FAMILY_1_NAME`
- `FAMILY_1_AGE`
- `FAMILY_1_STATUS`
- `FAMILY_1_RELATION_TO_CLIENT`
- `FAMILY_1_BIRTHDAY`
- `FAMILY_1_EDUCATIONAL_ATTAINMENT`
- `FAMILY_1_OCCUPATION`

Then repeat for rows 2..15 (for example `FAMILY_2_NAME`, `FAMILY_3_NAME`, etc.).

### Google Sheets example row text

- Name column: `{{FAMILY_1_NAME}}`
- Age column: `{{FAMILY_1_AGE}}`
- Status column: `{{FAMILY_1_STATUS}}`
- Relation column: `{{FAMILY_1_RELATION_TO_CLIENT}}`
- Birthday column: `{{FAMILY_1_BIRTHDAY}}`
- Educational Attainment column: `{{FAMILY_1_EDUCATIONAL_ATTAINMENT}}`
- Occupation column: `{{FAMILY_1_OCCUPATION}}`

Copy that row down and change `1` to `2`, `3`, etc.
