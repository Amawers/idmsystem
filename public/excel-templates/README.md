# Excel Templates

Place case export Excel templates in this folder.

Current supported template:

- `sp-case-template.xlsx` → used by Single Parent (`SP`) record export.
- `fa-case-template.xlsx` → used by Financial Assistance (`FA`) record export.
- `ciclcar-case-template.xlsx` → used by CICL/CAR (`CICLCAR`) record export.
- `fac-case-template.xlsx` → used by Family Assistance Card (`FAC`) record export.
- `far-case-template.xlsx` → used by Family Assistance Record (`FAR`) bulk export.
- `sc-case-template.xlsx` → used by Senior Citizen (`SC`) record export.
- `ivac-case-template.xlsx` → used by Incidence on VAC (`IVAC`) export.

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

### FAR bulk export (one click for all rows)

In the FAR tab, use **EXPORT ALL FAR** to export all currently visible FAR records (after filters/search).

To make bulk export work, create **one template row** in `far-case-template.xlsx` with inline tokens, for example:

- `{{CASE_ID}}`
- `{{DATE}}`
- `{{RECEIVING_MEMBER}}`
- `{{EMERGENCY}}`
- `{{ASSISTANCE}}`
- `{{UNIT}}`
- `{{QUANTITY}}`
- `{{COST}}`
- `{{PROVIDER}}`
- `{{PROVIDER}}`
- `{{STATUS}}`
- `{{PRIORITY}}`

The exporter duplicates that row once per record and fills each row with the corresponding values.

## CICL/CAR template fields (per record export)

CICL/CAR export is **per row/record** only.

- Use the row action menu in CICL/CAR table
- Click **Export Excel** for the specific record

Create `ciclcar-case-template.xlsx` and use named ranges or inline placeholders.

### CICL/CAR placeholders

- `{{CASE_ID}}`
- `{{CASE_MANAGER}}`
- `{{CREATED_AT}}`
- `{{COMPLAINANT_ADDRESS}}`
- `{{COMPLAINANT_ALIAS}}`
- `{{COMPLAINANT_BIRTH_DATE}}`
- `{{COMPLAINANT_CONTACT_NUMBER}}`
- `{{COMPLAINANT_NAME}}`
- `{{COMPLAINANT_RELATIONSHIP}}`
- `{{COMPLAINANT_SEX}}`
- `{{COMPLAINANT_VICTIM}}`
- `{{FAMILY_BACKGROUND_COUNT}}`
- `{{FAMILY_BACKGROUND_JSON}}`
- `{{PRIORITY}}`
- `{{PROFILE_ADDRESS}}`
- `{{PROFILE_AGE}}`
- `{{PROFILE_ALIAS}}`
- `{{PROFILE_BIRTH_DATE}}`
- `{{PROFILE_CLIENT_CATEGORY}}`
- `{{PROFILE_CONTACT_NUMBER}}`
- `{{PROFILE_DISABILITY}}`
- `{{PROFILE_EDUCATIONAL_ATTAINMENT}}`
- `{{PROFILE_EDUCATIONAL_STATUS}}`
- `{{PROFILE_FIRST_NAME}}`
- `{{PROFILE_GENDER}}`
- `{{PROFILE_IP_GROUP}}`
- `{{PROFILE_LAST_NAME}}`
- `{{PROFILE_MIDDLE_NAME}}`
- `{{PROFILE_NAME}}`
- `{{PROFILE_NATIONALITY}}`
- `{{PROFILE_RELIGION}}`
- `{{PROFILE_SEX}}`
- `{{PROFILE_STATUS}}`
- `{{RECORD_DETAILS}}`
- `{{REFERRAL_BARANGAY}}`
- `{{REFERRAL_CITY}}`
- `{{REFERRAL_DATE_REFERRED}}`
- `{{REFERRAL_PROVINCE}}`
- `{{REFERRAL_REASON}}`
- `{{REFERRAL_REFERRED_TO}}`
- `{{REFERRAL_REGION}}`
- `{{REMARKS}}`
- `{{REPEAT_OFFENDER}}`
- `{{SPECIFIC_VIOLATION}}`
- `{{STATUS}}`
- `{{UPDATED_AT}}`
- `{{VIOLATION}}`
- `{{VIOLATION_ADMISSION_DATE}}`
- `{{VIOLATION_DATE_TIME_COMMITTED}}`
- `{{VIOLATION_PLACE_COMMITTED}}`
- `{{VIOLATION_PREVIOUS_OFFENSE}}`
- `{{VIOLATION_STATUS}}`
- `{{VISIBILITY}}`

### CICL/CAR family background per-row tokens

Family background entries are available up to 15 rows:

- `{{CICLCAR_FAMILY_1_NAME}}`, `{{CICLCAR_FAMILY_1_RELATIONSHIP}}`, `{{CICLCAR_FAMILY_1_AGE}}`, `{{CICLCAR_FAMILY_1_SEX}}`, `{{CICLCAR_FAMILY_1_STATUS}}`, `{{CICLCAR_FAMILY_1_CONTACT_NUMBER}}`, `{{CICLCAR_FAMILY_1_EDUCATIONAL_ATTAINMENT}}`, `{{CICLCAR_FAMILY_1_EMPLOYMENT}}`
- `{{CICLCAR_FAMILY_2_NAME}}`, `{{CICLCAR_FAMILY_2_RELATIONSHIP}}`, ...
- ... up to `{{CICLCAR_FAMILY_15_*}}`

## Family Assistance Card template fields (per record export)

FAC export is **per row/record** only.

- Use the row action menu in FAC table
- Click **Export Excel** for the specific record

Create `fac-case-template.xlsx` and use named ranges or inline placeholders.

### FAC text/date placeholders

- `{{BARANGAY_CAPTAIN}}`
- `{{CASE_ID}}`
- `{{CASE_MANAGER}}`
- `{{CREATED_AT}}`
- `{{DATE_REGISTERED}}`
- `{{FAMILY_MEMBER_COUNT}}`
- `{{FAMILY_MEMBERS_JSON}}`
- `{{HEAD_4PS_BENEFICIARY}}` (Yes/No)
- `{{HEAD_AGE}}`
- `{{HEAD_ALTERNATE_CONTACT_NUMBER}}`
- `{{HEAD_BIRTHDATE}}`
- `{{HEAD_BIRTHPLACE}}`
- `{{HEAD_CIVIL_STATUS}}`
- `{{HEAD_CONTACT_NUMBER}}`
- `{{HEAD_FIRST_NAME}}`
- `{{HEAD_FULL_NAME}}`
- `{{HEAD_ID_CARD_NUMBER}}`
- `{{HEAD_ID_CARD_PRESENTED}}`
- `{{HEAD_IP_ETHNICITY}}` (Yes/No)
- `{{HEAD_IP_ETHNICITY_TYPE}}`
- `{{HEAD_LAST_NAME}}`
- `{{HEAD_MIDDLE_NAME}}`
- `{{HEAD_MONTHLY_INCOME}}`
- `{{HEAD_MOTHERS_MAIDEN_NAME}}`
- `{{HEAD_NAME_EXTENSION}}`
- `{{HEAD_OCCUPATION}}`
- `{{HEAD_PERMANENT_ADDRESS}}`
- `{{HEAD_RELIGION}}`
- `{{HEAD_SEX}}`
- `{{HOUSE_OWNERSHIP}}`
- `{{LOCATION_BARANGAY}}`
- `{{LOCATION_CITY_MUNICIPALITY}}`
- `{{LOCATION_DISTRICT}}`
- `{{LOCATION_EVACUATION_CENTER}}`
- `{{LOCATION_PROVINCE}}`
- `{{LOCATION_REGION}}`
- `{{LSWDO_NAME}}`
- `{{PRIORITY}}`
- `{{SHELTER_DAMAGE}}`
- `{{STATUS}}`
- `{{UPDATED_AT}}`
- `{{VISIBILITY}}`
- `{{VULNERABLE_LACTATING_WOMEN}}`
- `{{VULNERABLE_OLDER_PERSONS}}`
- `{{VULNERABLE_PREGNANT_WOMEN}}`
- `{{VULNERABLE_PWDS}}`

### FAC family member per-row tokens

Family members are available up to 15 rows:

- `{{FAC_FAMILY_1_NAME}}`, `{{FAC_FAMILY_1_RELATION_TO_HEAD}}`, `{{FAC_FAMILY_1_BIRTHDATE}}`, `{{FAC_FAMILY_1_AGE}}`, `{{FAC_FAMILY_1_SEX}}`, `{{FAC_FAMILY_1_EDUCATIONAL_ATTAINMENT}}`, `{{FAC_FAMILY_1_OCCUPATION}}`, `{{FAC_FAMILY_1_REMARKS}}`
- `{{FAC_FAMILY_2_NAME}}`, `{{FAC_FAMILY_2_RELATION_TO_HEAD}}`, ...
- ... up to `{{FAC_FAMILY_15_*}}`

## Senior Citizen template fields (per record export)

Senior Citizen export is **per row/record** only.

- Use the row action menu in SC table
- Click **Export Excel** for the specific record

Create `sc-case-template.xlsx` and use named ranges or inline placeholders.

### SC text/date placeholders

- `{{ASSETS_PERSONAL_MOVABLE}}`
- `{{ASSETS_REAL_IMMOVABLE}}`
- `{{ASSISTING_PERSON}}`
- `{{BARANGAY}}`
- `{{CAPABILITY_TO_TRAVEL}}`
- `{{CASE_ID}}`
- `{{CASE_MANAGER}}`
- `{{CHECKUP_FREQUENCY}}`
- `{{CHILDREN}}`
- `{{CITY_MUNICIPALITY}}`
- `{{COMMUNITY_SERVICE_INVOLVEMENT}}`
- `{{CONTACT_NUMBER}}`
- `{{CURRENT_PENSION}}`
- `{{CREATED_AT}}`
- `{{DATE_OF_BIRTH}}`
- `{{DATE_OF_INTERVIEW}}`
- `{{DENTAL_CONCERN}}`
- `{{DIFFICULTY}}`
- `{{EDUCATIONAL_ATTAINMENT}}`
- `{{EMAIL_ADDRESS}}`
- `{{ETHNIC_ORIGIN}}`
- `{{FATHERS_NAME}}`
- `{{FATHER_LAST_NAME}}`
- `{{FATHER_FIRST_NAME}}`
- `{{FATHER_MIDDLE_NAME}}`
- `{{GENDER}}`
- `{{GSIS}}`
- `{{HEARING}}`
- `{{HOUSEHOLD_CONDITION}}`
- `{{INTERVIEWER}}`
- `{{LANGUAGE_SPOKEN_WRITTEN}}`
- `{{LIVING_WITH}}`
- `{{MARITAL_STATUS}}`
- `{{MEDICAL_CONCERN}}`
- `{{MEDICINES_FOR_MAINTENANCE}}`
- `{{MOTHERS_MAIDEN_NAME}}`
- `{{MOTHER_MAIDEN_LAST_NAME}}`
- `{{MOTHER_MAIDEN_FIRST_NAME}}`
- `{{MOTHER_MAIDEN_MIDDLE_NAME}}`
- `{{NAME_OF_SPOUSE}}`
- `{{SPOUSE_LAST_NAME}}`
- `{{SPOUSE_FIRST_NAME}}`
- `{{SPOUSE_MIDDLE_NAME}}`
- `{{NEEDS_COMMONLY_ENCOUNTERED}}`
- `{{OPTICAL}}`
- `{{OSCA_ID_NUMBER}}`
- `{{OTHER_DEPENDENTS}}`
- `{{OTHER_GOV_ID}}`
- `{{PHILHEALTH}}`
- `{{PLACE_OF_BIRTH}}`
- `{{PLACE_OF_INTERVIEW}}`
- `{{PRIORITY}}`
- `{{PROVINCE}}`
- `{{REGION}}`
- `{{RELATION_TO_SENIOR}}`
- `{{RELIGION}}`
- `{{SC_ASSOCIATION}}`
- `{{SCHEDULED_CHECKUP}}`
- `{{SENIOR_FIRST_NAME}}`
- `{{SENIOR_LAST_NAME}}`
- `{{SENIOR_MIDDLE_NAME}}`
- `{{SENIOR_NAME}}`
- `{{SERVICE_BUSINESS_EMPLOYMENT}}`
- `{{SOCIAL}}`
- `{{SOURCE_OF_INCOME_ASSISTANCE}}`
- `{{STATUS}}`
- `{{TECHNICAL_SKILLS}}`
- `{{TIN}}`
- `{{UPDATED_AT}}`
- `{{VISIBILITY}}`

### SC children per-token mapping

Children are available as per-row tokens up to 15 items:

- `{{CHILD_1_NAME}}`, `{{CHILD_1_OCCUPATION}}`, `{{CHILD_1_INCOME}}`, `{{CHILD_1_AGE}}`, `{{CHILD_1_WORKING_STATUS}}`
- `{{CHILD_2_NAME}}`, `{{CHILD_2_OCCUPATION}}`, `{{CHILD_2_INCOME}}`, `{{CHILD_2_AGE}}`, `{{CHILD_2_WORKING_STATUS}}`
- ... up to `{{CHILD_15_*}}`

`CHILD_n_WORKING_STATUS` outputs `Working` or `Not Working`.

### SC checkbox setup in Excel (recommended)

For SC, checkbox-type values are exported as text (examples: `Working`, `Not Working`, `Yes`, `No`, or comma-separated lists).

Use this pattern in your template:

1. Put the raw token in a hidden/helper cell (example `Z2: {{CAPABILITY_TO_TRAVEL}}`).
2. In the visible checkbox cell, use a formula to show checked/unchecked symbol.

Example formulas:

- Capability to travel = Yes  
	`=IF(LOWER(TRIM($Z$2))="yes","☑","☐")`
- Capability to travel = No  
	`=IF(LOWER(TRIM($Z$2))="no","☑","☐")`

For child working status:

- Put `{{CHILD_1_WORKING_STATUS}}` in a helper cell (example `Z10`).
- Working checkbox cell: `=IF(LOWER(TRIM($Z$10))="working","☑","☐")`
- Not Working checkbox cell: `=IF(LOWER(TRIM($Z$10))="not working","☑","☐")`

For multi-select SC fields (like `EDUCATIONAL_ATTAINMENT`, `TECHNICAL_SKILLS`, etc.), values are comma-separated text.  
Use `SEARCH` to check if a label exists in the list:

- Example for `Elementary` in helper cell `Z20`:
	`=IF(ISNUMBER(SEARCH("Elementary",$Z$20)),"☑","☐")`

#### Educational Attainment checkbox example (SC)

1. Put `{{EDUCATIONAL_ATTAINMENT}}` in helper cell `Z20`.
2. For each checkbox row, use one formula based on the exact label.

Examples:

- Elementary Level: `=IF(ISNUMBER(SEARCH("Elementary Level",$Z$20)),"☑","☐")`
- Elementary Graduate: `=IF(ISNUMBER(SEARCH("Elementary Graduate",$Z$20)),"☑","☐")`
- High School Level: `=IF(ISNUMBER(SEARCH("High School Level",$Z$20)),"☑","☐")`
- Highschool Graduate: `=IF(ISNUMBER(SEARCH("Highschool Graduate",$Z$20)),"☑","☐")`
- College Level: `=IF(ISNUMBER(SEARCH("College Level",$Z$20)),"☑","☐")`
- College Graduate: `=IF(ISNUMBER(SEARCH("College Graduate",$Z$20)),"☑","☐")`
- Vocational: `=IF(ISNUMBER(SEARCH("Vocational",$Z$20)),"☑","☐")`
- Post Graduate: `=IF(ISNUMBER(SEARCH("Post Graduate",$Z$20)),"☑","☐")`
- Not Attended School: `=IF(ISNUMBER(SEARCH("Not Attended School",$Z$20)),"☑","☐")`

#### Very simple setup (copy this)

If you want the easiest possible setup:

1. In cell `Z20`, type: `{{EDUCATIONAL_ATTAINMENT}}`
2. In your visible checkbox cells, paste these formulas:

- `B30` (Elementary Level): `=IF(ISNUMBER(SEARCH("Elementary Level",$Z$20)),"☑","☐")`
- `B31` (Elementary Graduate): `=IF(ISNUMBER(SEARCH("Elementary Graduate",$Z$20)),"☑","☐")`
- `B32` (High School Level): `=IF(ISNUMBER(SEARCH("High School Level",$Z$20)),"☑","☐")`
- `B33` (Highschool Graduate): `=IF(ISNUMBER(SEARCH("Highschool Graduate",$Z$20)),"☑","☐")`
- `B34` (College Level): `=IF(ISNUMBER(SEARCH("College Level",$Z$20)),"☑","☐")`
- `B35` (College Graduate): `=IF(ISNUMBER(SEARCH("College Graduate",$Z$20)),"☑","☐")`
- `B36` (Vocational): `=IF(ISNUMBER(SEARCH("Vocational",$Z$20)),"☑","☐")`
- `B37` (Post Graduate): `=IF(ISNUMBER(SEARCH("Post Graduate",$Z$20)),"☑","☐")`
- `B38` (Not Attended School): `=IF(ISNUMBER(SEARCH("Not Attended School",$Z$20)),"☑","☐")`

3. Hide column `Z` (optional).

Done. When you export SC, the checkboxes in `B30:B38` will auto-check.

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
