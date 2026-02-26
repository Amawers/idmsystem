# Excel Templates

Place case export Excel templates in this folder.

Current supported template:

- `sp-case-template.xlsx` → used by Single Parent (`SP`) record export.
- `fa-case-template.xlsx` → used by Financial Assistance (`FA`) record export.
- `ivac-case-template.xlsx` → used by Incidence on VAC (`IVAC`) bulk export.

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

## Financial Assistance template fields

For `FA`, use either named ranges or inline placeholders with these names:

- `CASE_ID`
- `CASE_MANAGER`
- `STATUS`
- `PRIORITY`
- `VISIBILITY`
- `INTERVIEW_DATE`
- `DATE_RECORDED`
- `CLIENT_NAME`
- `ADDRESS`
- `PURPOSE`
- `BENIFICIARY_NAME`
- `CONTACT_NUMBER`
- `PREPARED_BY`
- `STATUS_REPORT`
- `CLIENT_CATEGORY`
- `GENDER`
- `FOUR_PS_MEMBER`
- `TRANSACTION`
- `NOTES`

Example inline tokens in Google Sheets:

- `Client: {{CLIENT_NAME}}`
- `Beneficiary: {{BENIFICIARY_NAME}}`
- `Date Recorded: {{DATE_RECORDED}}`

### FA bulk export (one click for all rows)

In the FA tab, use **EXPORT ALL FA** to export all currently visible FA records (after filters/search).

To make bulk export work, create **one template row** in `fa-case-template.xlsx` with inline tokens, for example:

- `{{CASE_ID}}`
- `{{DATE_RECORDED}}`
- `{{CLIENT_NAME}}`
- `{{BENIFICIARY_NAME}}`
- `{{PURPOSE}}`
- `{{STATUS}}`

The exporter duplicates that row once per record and fills each row with the corresponding values.

### IVAC internal `records` (jsonb) mapping

The `records` jsonb array is also flattened into row tokens up to 15 items:

- `REC_1_BARANGAY`, `REC_1_VAC_VICTIMS`, `REC_1_GENDER_MALE`, ...
- `REC_2_BARANGAY`, `REC_2_VAC_VICTIMS`, `REC_2_GENDER_MALE`, ...
- ... up to `REC_15_*`

Example tokens:

- `{{REC_1_BARANGAY}}`
- `{{REC_1_VAC_VICTIMS}}`
- `{{REC_1_AGE_0_TO_4}}`
- `{{REC_1_PHYSICAL_ABUSE}}`
- `{{REC_1_ACTION_LSWDO}}`

Available `*` suffixes for each `REC_n_*`:

- `BARANGAY`
- `VAC_VICTIMS`
- `GENDER_MALE`
- `GENDER_FEMALE`
- `AGE_0_TO_4`
- `AGE_5_TO_9`
- `AGE_10_TO_14`
- `AGE_15_TO_17`
- `AGE_18_PLUS`
- `PHYSICAL_ABUSE`
- `SEXUAL_ABUSE`
- `PSYCHOLOGICAL_ABUSE`
- `NEGLECT`
- `VIOLENCE_OTHERS`
- `PERP_IMMEDIATE_FAMILY`
- `PERP_CLOSE_RELATIVE`
- `PERP_ACQUAINTANCE`
- `PERP_STRANGER`
- `PERP_LOCAL_OFFICIAL`
- `PERP_LAW_OFFICER`
- `PERP_OTHERS`
- `ACTION_LSWDO`
- `ACTION_PNP`
- `ACTION_NBI`
- `ACTION_MEDICAL`
- `ACTION_LEGAL`
- `ACTION_OTHERS`

## IVAC template fields

For `IVAC`, use inline placeholders with these names:

- `CASE_ID`
- `PROVINCE`
- `MUNICIPALITY`
- `STATUS`
- `REPORTING_PERIOD`
- `CASE_MANAGERS`
- `TOTAL_VAC_VICTIMS`
- `TOTAL_MALE`
- `TOTAL_FEMALE`
- `BARANGAY_COUNT`
- `RECORDS_JSON`
- `NOTES`
- `CREATED_AT`
- `UPDATED_AT`

Example inline tokens in Google Sheets:

- `{{CASE_ID}}`
- `{{PROVINCE}}`
- `{{MUNICIPALITY}}`
- `{{TOTAL_VAC_VICTIMS}}`
- `{{STATUS}}`

### IVAC export behavior

IVAC export is **per row/record** (same pattern as Solo Parent).

- Use the row action menu in IVAC table
- Click **Export Excel** on the specific record you want to export
