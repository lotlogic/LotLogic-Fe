**LotCheck Admin Portal**

**Product Feedback & Development Priorities**

Henry — thanks for getting the admin portal to this stage. I did a full run-through today, logging in as admin, estate, and builder in sequence to get a real sense of how each journey feels. The core architecture is clearly solid, and there's a lot to work with here. The notes below are detailed and direct — please take them in the spirit they're intended, which is to make sure we're building something that will genuinely impress estate partners and withstand investor scrutiny. I've broken feedback into four sections: Admin, Estate Journey, Builder Journey, and Overall.

 

# **1\. Admin Login & Admin Functionality**

## **Login & Authentication**

The Microsoft authentication flow works, which is good. A few things to sort out:

•   	**Branding on login:** The login URL and interface should ideally reflect the LotCheck brand rather than a generic Microsoft page. Even a simple branded redirect landing page before the MS auth handoff would help.

•   	**Inconsistent first screen:** On first login I saw a 'Dashboard' screen with the subheading 'Manage the builders and the estates assigned to you.' On subsequent login it defaulted to 'Admin Users' instead. Not sure why this happened

## **Navigation & Tab Labels**

The top nav tabs (Users, State Rule Sets, Estates, Design On Lots, Builders, Brand Settings) are functional but the language needs refinement for non-technical users.

•   	**'Design On Lots':** This is not intuitive. What does it mean? Presumably it's showing which floor plans are matched to which lots — if so, call it something like 'Plan–Lot Matches' or 'Design Results'.

•   	**'Brand Settings':** It's unclear who this belongs to — LotCheck the business, the estate, or the builder? The section header gives no context. Needs either a clearer label or scope indicator.

•   	**'State Rule Sets':** Technically correct, but the label 'State Rule Sets' is fine for admin — just confirm it's never surfaced to estate or builder users.

 

## 

## **State Rule Sets**

This section is well-structured for a technical admin user. The structured editor / Raw JSON toggle works and the fields cover the right parameters. A few observations:

•   	**'Format JSON' button:** This doesn't appear to function — clicking it does nothing. Please either fix it or remove it.

•   	**Timestamp format on the table:** The 'Effective From' column shows raw UTC timestamps (e.g., 2026-02-11T02:32:00.000Z). These should display in a human-readable format (e.g., 11 Feb 2026\) in the table view.

•   	**Lot Area Bands / Lot Width Bands / Frontage Bands:** These sections display raw JSON arrays with no guidance on what format is expected. At minimum add a small example or documentation link — whoever is maintaining these rules needs to know the expected schema.

•   	**Road Facing Rules / Stage Rules / Precinct Rules / Advanced Conditional Rules:** These are all raw JSON fields with minimal guidance. This is fine for now given it's an admin-only view, but we should document the expected schema somewhere accessible.

•   	❓ *Is 'Requires Architectural Review' (true/false) meant to trigger a manual review flag in the lead workflow, or is it informational only? We need to confirm this is wired up correctly.*

 

 

# 

# **2\. Estate Journey**

## **Invitation Email**

This is the first touchpoint a real estate client experiences, and it needs work.

•   	**Sender name:** Currently 'BlockPlanner' at mail.blockplanner.com.au. 

•   	**Subject line and body copy:** Keen to massage this copy \- let me know the best way to do so. There’s also some technical detail we can delete from this email. 

•   	**Post-accept redirect:** When I accepted the invitation, I was redirected to the mockup sales/marketing page rather than the estate admin portal, whereas it should direct to login.

## **Estate Dashboard & Properties**

Once logged in (using the link from Slack), the estate view is a simplified version of the admin view. The core fields are there. Issues:

•   	**Theme color field:** The field shows a hex code (\#0F766E) with no colour picker or visual preview. If an estate user is asked to fill this in themselves, they will not know what to put. Either provide a colour picker UI, or remove it from the estate-facing form entirely and let us set it on their behalf during onboarding.  
Or we tell them where the colours will be used in a description, or ‘better yet, get them to add their colour pallete/ brand colours as, via primary, secondary, etc?

•   	**Logo upload:** Prefer to add guidance on accepted formats, minimum resolution, or aspect ratio. (e.g., 'PNG or SVG, minimum 200px wide, square or horizontal format preferred').

•   	**Team member roles:** All team members are set to 'USER' with no differentiation. We should at minimum have an 'Admin' role for the primary estate contact who can invite others. Query: is this on the roadmap?

 

## **Adding Lots — Critical Issue**

This is the most significant issue in the estate journey and needs to be a priority fix.

•   	**Manual lot entry is not viable:** Right now, the estate must add each lot individually through a long form (Block Key, Estate ID, Area, Zoning, Block Number, Section Number, Address, District, Division, Lifecycle Stage, Width, Depth, S1–S4 values, Overlays, Lot boundary preview, Frontage coordinates in GeoJSON, Lot type, Frontage (m), Road facing, Precinct, Frontage type, Planning ID, Max height, Max size, Max FSR, Max FSR upper, Max stories, Minimum area, Minimum depth, Front yard setback, Side yard setback, Rear yard setback, Example floor area, Example lot size, plus a GeoJSON polygon). This is 30+ fields per lot. No estate developer is going to do this manually for even 10 lots, let alone 50–100.

•   	**→** I was under the impression we had agreed on a file upload approach — a CSV or spreadsheet where the estate uploads all lot data at once and the system reads it in. If that's not yet built, this needs to be the next priority. The manual form can remain as a fallback or for individual edits, but bulk import is essential for any real estate.

•   	**Button language:** The buttons 'Refresh lots', 'Seed lots', 'Recompute designs' are technical jargon that estate users should never see. If these need to exist in the estate view, rename them to plain English (e.g., 'Reload', 'Import lots from template', 'Update plan matches').

•   	**S1, S2, S3, S4 fields:** What are these? If they're sideline setbacks or similar, label them clearly. An estate user completing this form has no idea what S1–S4 means.

•   	**GeoJSON Frontage Coordinate field:** Showing raw GeoJSON to an estate administrator is not appropriate. This data should be handled either through a map interface or uploaded as part of a data file — not typed in manually.

•   	❓ *Are we expecting estates to provide GeoJSON boundary data themselves, or are we sourcing this from a third-party data provider (e.g., PSMA/Geoscape)? This changes the approach significantly.*

 

## **Builder Approvals**

The concept is right — estates approve which builders can appear on their lots. A few issues:

•   	**Button label:** 'Create builder approval' is not natural language. Rename to 'Add builder to this estate' or 'Approve builder'.

•   	**Notes field:** It's unclear what the Notes field is for in this context. Add placeholder text explaining its purpose (e.g., 'Internal notes about this builder relationship — not visible to the builder').

•   	**Timestamp display:** Effective From shows UTC timestamps in the table. Display as a readable date.

 

## **Estate Rule Set**

The estate-level rule set section says 'One estate rule set is supported currently' and 'No estate rule set configured.' The 'Create rule set' button opens what appears to be the same JSON-based form as the admin State Rule Sets.

•   	**Clarity of purpose:** Is the Estate Rule Set meant to override or supplement the State Rule Set? This needs to be clearer — both to us internally and reflected in the UI. If the estate can define their own rules on top of state minimums (which makes sense for things like estate-specific setbacks or architectural guidelines), document this hierarchy somewhere.

•   	**→** Consider adding a simple visual or text explanation: 'State rules set the minimum. Estate rules can be stricter — they apply on top of state requirements.'

Note: I would have thought the rule sets populate based on the State / Territory they are based in? And then it’s mainly the estate’s job to outline their estate’s rules / design guidelines for the system to ingest?

 

# **3\. Builder Journey**

## **Invitation Email**

Same issues as the estate invitation — sent from BlockPlanner, generic subject line, no context about who invited them or why. The builder receiving this needs to know which estate they're being invited to participate in, and what they need to do. This is especially important for builders because the action we want them to take (uploading floor plans) requires real effort.

•   	**(Mitch to draft) / mockup**

 

## **Builder Dashboard**

Once logged in, the builder view is very limited — essentially just a company name field and the floor plan form. That's appropriate for the current scope, but there are a few things to address:

•   	**No context on which estates they're approved for:** A builder logs in and has no idea which estates they've been approved for or what's expected of them. At minimum, show a list of their approved estates with a status (e.g., 'Hamilton Rise — Approved — 3 floor plans uploaded').

•   	**No lead or performance data:** There's currently no way for a builder to see how their plans are performing — how many times they've been viewed, how many leads have been generated. How would this fit into the plan?

 

## **Floor Plan Entry — Critical Issue**

Like the lot entry form for estates, the floor plan entry form requires each plan to be entered one at a time with the following fields:

•   	Name

•   	Floor plan URL (or file upload — PDF or image)

•   	Bedrooms, Bathrooms, Garages

•   	Area (sqm), Design Width, Design Depth

•   	Features (Rumpus, Alfresco, Pergola checkboxes)

•   	Storeys, Building Height (m), Roof Pitch (deg)

•   	Architectural Style (free text)

•   	Front-facing service areas (dropdown)

 

This is manageable for a handful of plans, but a builder with 20–50 plans won't do this manually. We need:

•   	**→** A bulk upload option — ideally a spreadsheet/CSV template that builders complete and upload, similar to what's needed for lots. The individual form can remain for adding single plans or making edits.

•   	**→** Pre-populate sensible defaults where possible — e.g., if a builder has 15 single-storey plans, they shouldn't have to enter 'Storeys: 1' fifteen times.

•   	**'Design Depth':** This label is ambiguous — does it mean the footprint depth (front to back dimension of the building), or something else? Clarify with a tooltip or rename to 'Building Depth (m)'.

•   	**'Front-facing service areas':** '(not set)' dropdown with no options visible in the screenshot. What are the options? Is this wired up?

•   	**Architectural Style as free text:** This will create inconsistent data fast. If we're using architectural style to match against estate guidelines, it needs to be a controlled vocabulary (dropdown) — not free text. 'Traditional Australian', 'Traditional australian', 'trad australian' will not match reliably.

•   	**→** Define an agreed list of architectural styles and make this a dropdown or multi-select with standardised options.

 

# **4\. Overall Feedback & Priority Summary**

## **What's Working**

•   	The underlying data model and rule engine structure is solid — state rules, estate rules, plan attributes, lot attributes. The architecture makes sense.

•   	The admin panel gives us real configurability over jurisdictions, which will be important as we expand beyond NSW.

•   	Authentication works. The role separation between admin, estate, and builder is conceptually correct.

•   	Builder approvals per estate is the right model — estates need control over who appears on their lots.

 

## **Priority Fixes — Do These First**

If I had to rank what needs to happen before we can show this to a real estate partner:

•   	**P1 — Fix sender branding:** All emails must come from LotCheck, not BlockPlanner. (on Mitch \- just advise best way to resolve)

•   	**P1 — Fix post-accept redirect:** After accepting an invitation, users must land in their portal, not the marketing site.

•   	**P1 — Bulk lot import for estates:** Manual lot entry is not viable. Confirm the CSV/file upload approach and build it.

•   	**P1 — Bulk floor plan upload for builders:** Same as above. Individual entry is fine for edits but not for initial setup.

•   	**P2 — Improve invitation email copy:** Both estate and builder emails need context, warmth, and clearer CTAs.

•   	**P2 — Hide internal/system fields from estate and builder views:** Estate ID, timestamps, Prototype estate checkbox, S1–S4 labels, raw GeoJSON fields.

•   	**P2 — Fix 'Design On Lots' tab name and empty-state clarity:** The tab name is confusing. The section needs a clearer purpose.

•   	**P2 — Logo upload guidance:** Add file format and dimension requirements to the upload field.

•   	**P3 — Architectural Style controlled vocabulary:** Convert free text to a dropdown.

•   	**P3 — Readable timestamps throughout:** Replace UTC strings with human-readable dates in all table views.

•   	**P3 — Builder view: show approved estates:** Builders need to know which estates they're active on.

 

## **Main question**

•   	❓ *How automated can we make the file upload process for both estate plans and floor plans*

 
Questions back to Mitch
Tab 1
·
Architectural Style as free text
Henry Tait
Henry Tait
09:26 Today
Can you provide a list?
Tab 1
·
No context on which estates they're approved for
Henry Tait
Henry Tait
09:25 Today
Does a builder need to say which floor plan is allowed for which estate, currently any of their floorplans are treated as viable for any of the estates they are assigned to as long as the floor plan passes the rule sets
Tab 1
·
(Mitch to draft) / mockup
Henry Tait
Henry Tait
09:23 Today
Yep - please provide copy and we will implement
Tab 1
·
Are we expecting estates to provide GeoJSON boundary data themselves
Henry Tait
Henry Tait
09:22 Today
Our scope currently has this being imported from a DXF file provided by the estate
Tab 1
·
GeoJSON Frontage Coordinate field
Henry Tait
Henry Tait
09:21 Today
This should be generated by the DXF import so we can hide from the estate manager if you like
Tab 1
·
S1, S2, S3, S4 fields
Henry Tait
Henry Tait
09:20 Today
They are the side lengths of the lots I believe, and they get set via import of the DXF file
Tab 1
·
Manual lot entry is not viable
Henry Tait
Henry Tait
09:19 Today
@mitch@blockplanner.com.au  - yep - all of these fields are what was being set in the prototype with the sample data, I was hoping to be able to cut a bunch of these out, regardless if the estate is using a file upload process or not it would be good to only include the fields that matter, however I don't have the product knowledge to decide which ones do matter - we could look at maybe simplifying these to only fields specifically currently used by the front end? For reference at the moment the process would be for an estate to upload their DXF with the lot's and when they do that they set the default values for those lots, which removes a lot of the grunt work.
Show more
Tab 1
·
Team member roles
Henry Tait
Henry Tait
09:15 Today
I saw the admin role as the role for us, administrators of the whole system and USER as everyone else, We don't currently have levels within the builder or estate in scope, did you want me to look at adding that in?
Tab 1
·
Logo upload
Henry Tait
Henry Tait
09:12 Today
Do you want to enforce this, or just provide guidance?
Tab 1
·
Subject line and body copy
Henry Tait
Henry Tait
09:12 Today
If you are happy putting the copy in here that works for me
Tab 1
·
Currently 'BlockPlanner' at mail.blockplanner.com.au
Henry Tait
Henry Tait
09:11 Today
@mitch@blockplanner.com.au - let me know what you want that to be.

Client Responses (captured 2026-02-27)
- Architectural style list: Mitch will provide a canonical list.
- Builder dashboard context: Mitch clarified this is about showing which estates each builder company is approved on, not plan-by-plan estate assignments.
- GeoJSON frontage field: Mitch prefers cleaner UI and supports hiding this from estate/builder users.
- Manual lot entry: Mitch agreed to reduce fields and proposed 3 groups:
  - Auto from DXF: boundary polygon, frontage line, area, block/section/division, address, S1-S4.
  - Must be manual: zoning, lot type, overlays, lifecycle stage, road facing.
  - Keep but hide by default: advanced overrides (setbacks, max height, FSR, etc.).
- Team member roles: not a priority now; likely future enhancement.
- Invitation email copy: Mitch will provide updated subject/body copy.
- Logo upload: prefers file-type enforcement if low effort; if not, prioritize guidance and higher-impact items.
- Sender branding thread (`BlockPlanner` sender): marked resolved, Mitch will provide any final preferred sender wording.
