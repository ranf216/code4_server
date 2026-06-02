Code 4 \- Axis

 DESIGN SPECIFICATIONS

Work in progress \- review version (Note \- This is not the full document, version is for comments only) 

Mobile Application- for officers and resident/client

Management Portal \- for Admin / managers/ clients

SDS Document Versions: 

| Ver \#  | Date  | Comments |
| :---- | :---- | :---- |
| 1.0 | 02/05/2026 | First draft |
| 1.1 | 02/15/2026 | Edits after quick review |
| 1.2 | 03/08/2026 | Edit after review call \- Ability to add files to emergency calls \+ transcription Share & Export Panic button Officer role and evaluation |
| 2 | 03/09/2026 | Shift management \- chapter 4.7, 3.10 Route optimization \- chapter 4.8, 3.10 Live Tracking \- chapter 4.9, 5.3 |
| 2.1 | 03/13/2026 | Update high level functionality list |
| 2.2  | 03/30/2026 | Updates according to the meeting comments \- Remove packages options and Executive (chapter 5.4.5, user’s package, etc) Residents: add vehicles Officer app: resident search (3.10) Remove the 3D map option (from chapters 3.4.1.1, 4.2.6, and all mentions in the doc) Post order \- job description |
| 3 | 04/15/2026 | Post Orders \- Chapters 4.10, 3.12, 5.4.3, 2.9 |
| 4 | 04/28/2026 | Person Of Interest, Trespass Intelligence \- Chapters 4.11, 5.4.4  |
| 5 | 04/30/2026 | Incident Report \- templates and generation \- Chapters 4.12, 4.5.5, 4.4.7, 3.4.4, 3.4.5, 2.5.3 |
|  |  |  |

Contents 

[**1 General Project Description	11**](#1-general-project-description)

[1.1 Technologies	11](#1.1-technologies)

[1.2 Mobile OS and browsers	11](#1.2-mobile-os-and-browsers)

[1.3 Screen Resolutions	12](#1.3-screen-resolutions)

[1.4 GUI Language	12](#1.4-gui-language)

[1.5 Integrations	12](#1.5-integrations)

[1.6 Accessibility	13](#1.6-accessibility)

[1.7 Permissions	13](#1.7-permissions)

[1.8 Main Functionality	14](#1.8-main-functionality)

[**2 Residents/clients Mobile App description	16**](#2-residents/clients-mobile-app-description)

[2.1 Splash Screen	16](#2.1-splash-screen)

[2.2 Sign In Screen	16](#2.2-sign-in-screen)

[2.2.1 Approved User	16](#2.2.1-approved-user)

[2.2.2 Logout	17](#2.2.2-logout)

[2.2.3 Terms and Conditions & Privacy Policy	17](#2.2.3-terms-and-conditions-&-privacy-policy)

[2.2.4 Access to GPS	17](#2.2.4-access-to-gps)

[2.3 Main Menu	17](#2.3-main-menu)

[2.3.1 Navigation bar	17](#2.3.1-navigation-bar)

[2.3.2 Side menu	18](#2.3.2-side-menu)

[2.4 Home Screen	18](#2.4-home-screen)

[2.4.1 Security or Medical Emergency Call	18](#2.4.1-security-or-medical-emergency-call)

[2.4.1.1 User details	18](#2.4.1.1-user-details)

[2.4.1.2 Additional Information	19](#2.4.1.2-additional-information)

[2.4.1.3.1 Tracking	22](#2.4.1.3.1-tracking)

[2.4.1.3.2 Edit an emergency call	22](#2.4.1.3.2-edit-an-emergency-call)

[2.4.1.3.4 Closing an emergency call	23](#2.4.1.3.4-closing-an-emergency-call)

[2.4.1.3.5 Status Change	24](#2.4.1.3.5-status-change)

[2.4.1.4 Out of Service	24](#2.4.1.4-out-of-service)

[2.4.2 Concierge Services	24](#2.4.2-concierge-services)

[2.4.2.1 Service Types	25](#2.4.2.1-service-types)

[2.4.2.2 Create a Service Call	25](#2.4.2.2-create-a-service-call)

[2.4.3 Panic button	26](#2.4.3-panic-button)

[2.5 My Calls List and Incident Reports	27](#2.5-my-calls-list-and-incident-reports)

[2.5.1 Open Calls list	28](#2.5.1-open-calls-list)

[2.5.1.1 Call Details	28](#2.5.1.1-call-details)

[2.5.1.2 Edit a Call	30](#2.5.1.2-edit-a-call)

[2.5.1.3 Cancel a Call	30](#2.5.1.3-cancel-a-call)

[2.5.1.4 Status Change	31](#2.5.1.4-status-change)

[2.5.1.5 Closing the call	31](#2.5.1.5-closing-the-call)

[2.5.2 History	31](#2.5.2-history)

[2.5.2.1 Call Details	32](#2.5.2.1-call-details)

[2.5.2.1.1 Reaction button	33](#2.5.2.1.1-reaction-button)

[2.5.2.1.2 Comment	33](#2.5.2.1.2-comment)

[2.5.2.2 Moving from Future to History	34](#2.5.2.2-moving-from-future-to-history)

[2.5.3 Incident Reports list	34](#2.5.3-incident-reports-list)

[2.6 Push Messages	34](#2.6-push-messages)

[2.7 My Account	35](#2.7-my-account)

[2.7.1 My Details	35](#2.7.1-my-details)

[2.8 Officers Information	36](#2.8-officers-information)

[2.8.1 Officers list \-	36](#2.8.1-officers-list--)

[The list displays the following details per officer:	36](#the-list-displays-the-following-details-per-officer:)

[2.8.2 Officer’s Details	37](#2.8.2-officer’s-details)

[2.8.3 Featured Officer	37](#2.8.3-featured-officer)

[2.9 Post Orders	37](#2.9-post-orders)

[2.10 Communication Test	38](#2.10-communication-test)

[2.11 Other Menu Options	38](#2.11-other-menu-options)

[2.11.1 Term of Use	38](#2.11.1-term-of-use)

[2.11.2 About Us	38](#2.11.2-about-us)

[2.11.3 Contact Us	38](#2.11.3-contact-us)

[**3 Officer Mobile Application Description	39**](#3-officer-mobile-application-description)

[3.1 Splash Screen	39](#3.1-splash-screen)

[3.2.1 Approved User	39](#3.2.1-approved-user)

[3.2.2 Logout	39](#3.2.2-logout)

[3.2.3 Terms and Conditions & Privacy Policy	40](#3.2.3-terms-and-conditions-&-privacy-policy)

[3.2.4 Access to GPS	40](#3.2.4-access-to-gps)

[3.3 Main Menu	40](#3.3-main-menu)

[3.3.1 Navigation bar	40](#3.3.1-navigation-bar)

[3.3.2 Side menu	40](#3.3.2-side-menu)

[3.4 Main screen \- My Calls	41](#3.4-main-screen---my-calls)

[3.4.1 Open Calls list	41](#3.4.1-open-calls-list)

[3.4.1.1 Call Details	42](#3.4.1.1-call-details)

[3.4.1.2 Edit a Call	43](#3.4.1.2-edit-a-call)

[3.4.1.3 New Calls	44](#3.4.1.3-new-calls)

[3.4.1.4 Canceled Call	44](#3.4.1.4-canceled-call)

[3.4.1.5 Closing the call	44](#3.4.1.5-closing-the-call)

[3.4.2 Security or Medical calls	44](#3.4.2-security-or-medical-calls)

[3.4.2.2 Emergency call Details	45](#3.4.2.2-emergency-call-details)

[3.4.2.2.1 Accepting the Call	46](#3.4.2.2.1-accepting-the-call)

[3.4.2.2.2 Tracking	47](#3.4.2.2.2-tracking)

[3.4.2.3 Edit a Call	48](#3.4.2.3-edit-a-call)

[3.4.2.4 Closing the call	48](#3.4.2.4-closing-the-call)

[3.4.3 Filters and search	49](#3.4.3-filters-and-search)

[3.4.4 Create an Incident Report	49](#3.4.4-create-an-incident-report)

[3.4.5 Report Life Cycle	50](#3.4.5-report-life-cycle)

[3.4.6 Review and Edit reports	51](#3.4.6-review-and-edit-reports)

[3.5 Panic button	51](#3.5-panic-button)

[3.6 Check-in/out	53](#3.6-check-in/out)

[3.6.1 Check-in/out	53](#3.6.1-check-in/out)

[3.6.2 Hours list	53](#3.6.2-hours-list)

[3.7 Calls History	54](#3.7-calls-history)

[3.7.1 Calls List	54](#3.7.1-calls-list)

[3.7.2 Call Details	54](#3.7.2-call-details)

[3.7.3 Moving from Future to History	56](#3.7.3-moving-from-future-to-history)

[3.7.4 Filters and Search	56](#3.7.4-filters-and-search)

[3.8 Maintenance reports	56](#3.8-maintenance-reports)

[3.8.1 Create a new task (maintenance report)	56](#3.8.1-create-a-new-task-\(maintenance-report\))

[3.8.2 Open Tasks list (maintenance report)	58](#3.8.2-open-tasks-list-\(maintenance-report\))

[3.8.3 Handling a task	60](#3.8.3-handling-a-task)

[3.8.3.1 Closing the task	60](#3.8.3.1-closing-the-task)

[3.9 Push Messages	61](#3.9-push-messages)

[3.10 Search for resident	62](#3.10-search-for-resident)

[3.11 My Shifts and Routes	63](#3.11-my-shifts-and-routes)

[3.12 Post Orders	64](#3.12-post-orders)

[3.12.1 Post Orders list	64](#3.12.1-post-orders-list)

[3.12.2 Post Order view	64](#3.12.2-post-order-view)

[3.12.3 Offline Access \- TBD if needed	65](#3.12.3-offline-access---tbd-if-needed)

[3.12.4 Acknowledgement flow \- TBD if needed	65](#3.12.4-acknowledgement-flow---tbd-if-needed)

[3.13 POI & Trespass	65](#3.13-poi-&-trespass)

[3.13.1 POI & Trespass list	65](#3.13.1-poi-&-trespass-list)

[3.13.2 POI & Trespass details	66](#3.13.2-poi-&-trespass-details)

[3.14 My Account	67](#3.14-my-account)

[3.14.1 My Details	67](#3.14.1-my-details)

[**4 Management System Description \- Manager (Operator) View	69**](#4-management-system-description---manager-\(operator\)-view)

[4.1 General Management	69](#4.1-general-management)

[4.1.1 Main menu	69](#4.1.1-main-menu)

[4.1.2 Change Password	69](#4.1.2-change-password)

[4.2 Communities / Customers Management	70](#4.2-communities-/-customers-management)

[4.2.1 Communities/Customers List	70](#4.2.1-communities/customers-list)

[4.2.1.1 Add New Community	71](#4.2.1.1-add-new-community)

[4.2.1.2 Edit Community	72](#4.2.1.2-edit-community)

[4.2.1.3 Delete Community	73](#4.2.1.3-delete-community)

[4.2.1.4 Sort / Filter	73](#4.2.1.4-sort-/-filter)

[4.2.2 Officers list (per community)	74](#4.2.2-officers-list-\(per-community\))

[4.2.3 Residents/customers list (per community)	74](#4.2.3-residents/customers-list-\(per-community\))

[4.2.3.1 Add New resident/client	74](#4.2.3.1-add-new-resident/client)

[4.2.3.2 Edit a resident/client	75](#4.2.3.2-edit-a-resident/client)

[4.2.3.3 Delete a resident/client	75](#4.2.3.3-delete-a-resident/client)

[4.2.3.4 Sort / Filter	76](#4.2.3.4-sort-/-filter)

[4.2.3.5 Communication Test (with resident/client)	76](#4.2.3.5-communication-test-\(with-resident/client\))

[4.2.4 Calls list (per community)	76](#4.2.4-calls-list-\(per-community\))

[4.2.5 Featured Officer	76](#4.2.5-featured-officer)

[4.2.6 2D Map upload and management	77](#4.2.6-2d-map-upload-and-management)

[4.2.6.1 Adding an asset	77](#4.2.6.1-adding-an-asset)

[4.2.6.2 Adding a post	79](#4.2.6.2-adding-a-post)

[4.2.6.3 Adding additional information	79](#4.2.6.3-adding-additional-information)

[4.2.7 Post and asset lists view	79](#4.2.7-post-and-asset-lists-view)

[4.3 Officers Table	80](#4.3-officers-table)

[4.3.1 Officers List	80](#4.3.1-officers-list)

[4.3.2 Add New Officer	81](#4.3.2-add-new-officer)

[4.3.3 Edit an Officer	82](#4.3.3-edit-an-officer)

[4.3.4 Delete an Officer	83](#4.3.4-delete-an-officer)

[4.3.5 Sort / Filter	83](#4.3.5-sort-/-filter)

[4.4 Calls Table, Live Panic button call and Incident Reports	83](#4.4-calls-table,-live-panic-button-call-and-incident-reports)

[4.4.1 Open Calls List	84](#4.4.1-open-calls-list)

[4.4.2 Open Call Details	84](#4.4.2-open-call-details)

[4.4.2.1 Emergency Test calls	86](#4.4.2.1-emergency-test-calls)

[4.4.3 History	87](#4.4.3-history)

[4.4.4 Filters	89](#4.4.4-filters)

[4.4.5 Assign call to an officer	89](#4.4.5-assign-call-to-an-officer)

[4.4.6 Panic button calls	90](#4.4.6-panic-button-calls)

[4.4.7 Incident Reports	91](#4.4.7-incident-reports)

[4.4.7.1  Opening a Report Details for Review	92](#4.4.7.1-opening-a-report-details-for-review)

[4.4.7.2  Editing a Report Details	92](#4.4.7.2-editing-a-report-details)

[4.5 Dashboard	93](#4.5-dashboard)

[4.5.1 Active Calls section	94](#4.5.1-active-calls-section)

[4.5.1.1 Statistics	94](#4.5.1.1-statistics)

[4.5.1.1.1 Filters	95](#4.5.1.1.1-filters)

[4.5.1.2 Calls list	95](#4.5.1.2-calls-list)

[4.5.1.3 Advanced statistics	95](#4.5.1.3-advanced-statistics)

[4.5.2 Tasks section	96](#4.5.2-tasks-section)

[4.5.3 Overall information	96](#4.5.3-overall-information)

[4.5.4 Live Tracking section	96](#4.5.4-live-tracking-section)

[4.5.5 Incident reports section	97](#4.5.5-incident-reports-section)

[4.6 Tasks management	97](#4.6-tasks-management)

[4.6.1 Task management view	97](#4.6.1-task-management-view)

[4.6.4 Creating a new task	99](#4.6.4-creating-a-new-task)

[4.6.3 Handling a task	100](#4.6.3-handling-a-task)

[4.6.3.1 Closing the task	101](#4.6.3.1-closing-the-task)

[4.7 Shift Management & Officer Allocation	101](#4.8.2-route-output)

[4.7.1  Shift Calendar View (Manager Portal)	101](#4.8.2-route-output)

[4.7.1.1  Calendar Display	102](#4.8.2-route-output)

[4.7.1.2  Filters & Search	102](#4.8.2-route-output)

[4.7.2  Shift Details	102](#4.8.2-route-output)

[4.7.2.1  Recurring Shifts	103](#4.8.2-route-output)

[4.7.2.2  Shift Status Lifecycle	104](#4.8.2-route-output)

[4.7.3  Officer Allocation	105](#4.8.2-route-output)

[4.7.3.1  Allocation Board	105](#4.8.2-route-output)

[4.7.3.2 Allocation Conflicts	105](#4.8.2-route-output)

[4.7.4  Push Messages \- Shift Management	105](#4.7.4-push-messages---shift-management)

[4.8  Patrol Route Optimisation	106](#4.8.2-route-output)

[4.8.1  Route Generation	106](#4.8.2-route-output)

[4.8.2 Route Output	107](#4.8.2-route-output)

[4.8.3  Route Display \- Manager Portal	108](#4.8.3-route-display---manager-portal)

[4.9  Live Tracking \- Management Portal	108](#4.9.5-map-refresh-rate)

[4.9.1  Map Display	108](#4.9.5-map-refresh-rate)

[4.9.2  Officer Marker Status Colours	109](#4.9.5-map-refresh-rate)

[4.9.3  Officer Info Panel	109](#4.9.5-map-refresh-rate)

[4.9.4  Filter & Selection Controls	110](#4.9.5-map-refresh-rate)

[4.9.5  Map Refresh Rate	110](#4.9.5-map-refresh-rate)

[4.9.6 Push Messages \- GPS & Tracking	110](#4.9.6-push-messages---gps-&-tracking)

[4.10 Post Orders	111](#4.10-post-orders)

[4.10.1 Post Orders management principles	111](#4.10.1-post-orders-management-principles)

[4.10.2 Post Orders list	111](#4.10.2-post-orders-list)

[4.10.3 Create a new post order	112](#4.10.3-create-a-new-post-order)

[4.10.3.1  Post Order Header	112](#4.10.3.1-post-order-header)

[4.10.3.2  Post Order Section	113](#4.10.3.2-post-order-section)

[4.10.4  Editing Post Order	114](#4.10.4-editing-post-order)

[4.10.5  Post Order Lifecycle	115](#4.10.5-post-order-lifecycle)

[4.10.5.1  Publishing a Post Order	116](#4.10.5.1-publishing-a-post-order)

[4.10.6  Delete a Post Order	116](#4.10.6-delete-a-post-order)

[4.10.7  Post Order History View	116](#4.10.7-post-order-history-view)

[4.11 Persons of Interest & Trespass Intelligence	117](#4.11-persons-of-interest-&-trespass-intelligence)

[4.11.1 Create a new POI / TI / MRC	118](#4.11.1-create-a-new-poi-/-ti-/-mrc)

[4.11.2 Review POI / TI / MRC list	121](#4.11.2-review-poi-/-ti-/-mrc-list)

[4.11.3 Edit a POI / TI / MRC record	122](#4.11.3-edit-a-poi-/-ti-/-mrc-record)

[4.11.3.1  Inactive a Record	122](#4.11.3.1-inactive-a-record)

[4.11.4 Export a POI / TI / MRC record (admin only)	123](#4.11.4-export-a-poi-/-ti-/-mrc-record-\(admin-only\))

[4.11.5 Record lifecycle	123](#4.11.5-record-lifecycle)

[4.11.6 Push Notification \- POI & Trespass	124](#4.11.6-push-notification---poi-&-trespass)

[4.12 Incident Reports Templates	124](#4.12-incident-reports-templates)

[4.12.1 Template List	125](#4.12.1-template-list)

[4.12.2 Create / Edit a template	125](#4.12.2-create-/-edit-a-template)

[4.12.2.1  Template Header Settings	125](#4.12.2.1-template-header-settings)

[4.12.2.2  Template Sections Settings	126](#4.12.2.2-template-sections-settings)

[4.12.2.2.1  Sections fields selection	127](#4.12.2.2.1-sections-fields-selection)

[4.12.2.3  Saving, Publishing and Archiving a Template	127](#4.12.2.3-saving,-publishing-and-archiving-a-template)

[4.12.3 Template formatting	128](#4.12.3-template-formatting)

[4.12.3.1  Report Style Settings (per Template)	128](#4.12.3.1-report-style-settings-\(per-template\))

[**5 Management System \- Super Admin View	130**](#5-management-system---super-admin-view)

[5.1 General Management	130](#5.1-general-management)

[5.1.1 Main menu	130](#5.1.1-main-menu)

[5.2 Users Table	130](#5.2-users-table)

[5.2.1 Users List	131](#5.2.1-users-list)

[5.2.2 Add New User	131](#5.2.2-add-new-user)

[5.2.3 Edit a User	132](#5.2.3-edit-a-user)

[5.2.3.1 Reset Password	132](#5.2.3.1-reset-password)

[5.2.4 Delete a user	133](#5.2.4-delete-a-user)

[5.2.5 Sort / Filter	133](#5.2.5-sort-/-filter)

[5.3 GPS & Tracking Settings	133](#5.3-gps-&-tracking-settings)

[5.4 General Settings	134](#5.4-general-settings)

[5.4.1 Service/Incident types and Maintenance reports types	134](#5.4.1-service/incident-types-and-maintenance-reports-types)

[5.4.2 Asset types	134](#5.4.2-asset-types)

[5.4.3 Post Order Sections types	134](#5.4.3-post-order-sections-types)

[5.4.4 Push notifications settings	136](#5.4.4-push-notifications-settings)

[5.4.4 POI & Trespass Settings	138](#5.4.4-poi-&-trespass-settings)

[5.4.5 Working hours	139](#5.4.5-working-hours)

**Detailed Software Design** 

## **1 General Project Description**  {#1-general-project-description}

This document is a detailed software design for Security Operations Platform \- a cloud based system, for clients, officers, supervisors, executives, and operations centers.

The system includes web portals and mobile applications, which enables end to end security management (of Code4 company), providing real-time visibility, reporting, and oversight across all sites.

The portals are used by the management in order to manage the daily security activities of the different clients.

The mobile app enables \-

1. Community Residents/clients to contact their local security team in order to report emergency situations as well as to ask for help in certain matters  
2. The officers, patrol team, to receive the calls and details, to be able to respond as quickly as possible (in case of emergencies). Consider

### **1.1 Technologies**  {#1.1-technologies}

The mobile app is developed with: 

1\. Mobile – React Native 

2\. Server – NodeJS on AWS cloud service 

3\. Management System \- NodeJS, HTML. 

4\. Database – mySql 

### **1.2 Mobile OS and browsers**  {#1.2-mobile-os-and-browsers}

The mobile app is suitable for: 

1\. iOS 13-18 

2\. Android 14-16 

The management system is suitable for the latest version (at the beginning of development) of the following browsers: 

1\. Google chrome 

2\. Firefox 

### **1.3 Screen Resolutions**  {#1.3-screen-resolutions}

The mobile app supports the standard iPhone and Android screens resolution. The management system is for desktop only. 

The app screen works in Portrait mode only (no Landscape support). 

### **1.4 GUI Language**  {#1.4-gui-language}

The app GUI language supports English only. However, the app supports multi-language (strings are placed in external XML, which can be translated). 

### 

### **1.5 Integrations** {#1.5-integrations}

The system will be able to integrate with any application that is API supported,

and interface with the management systems. 

Those interfaces are either for retrieving reports, or updating with relevant information.

For Example:

* Payment and Billing  
* 911  
* Maps  
* Access Control  
* CAD system (dispatch)  
* Twillo  
* GPS location when app is active

### **1.6 Accessibility** {#1.6-accessibility}

The portal should comply with accessibility standards.

The basic accessibility requirements \-

* Color Contrast (between backgrounds / fonts)  
* Font Size  
* Using Keyboard only (instead of a mouse) incl  
* Visual indication for location on page

Advanced requirements \-

* Screen reader

Optional solution \-

The portal will include an accessibility on/off button. Once clicking on this button the fonts and contrast will be adjusted, and the field focus indication will be displayed.

### **1.7 Permissions** {#1.7-permissions}

The portal should support different user types \-

* Admin (command, Code4)  
* Manager \- Operator (for each site)  
* Officer \- Guard

resident/client / Clients

* Planning  
* Logistics  
* Finance


Each user has a permission for read/write to a different activity.

Each user will see only the screens and activities he is allowed to see, therefore, the system should manage a few portal templates.

Screens with information will be filtered by the user’s details

### **1.8 Main Functionality**  {#1.8-main-functionality}

1. 3D Site Renderings

Site-specific 3D models created via walkthrough capture, enabling precise view of doors, windows, cameras, and assets for incident and maintenance logging. **Future \- 3D in the future, in phase 1 \- 2D map**

2. Advanced Incident Reporting

Comprehensive incident reporting with photo, video, police report, and narrative uploads tied to exact site locations \- Template-driven

3. Incident Pattern & Trend Analysis

Analytics identifying recurring issues, hotspots, escalation patterns, and emerging risks across properties. REPORTS

4. Patrol Route Optimization

AI-driven patrol route recommendations that reduce fuel use, time, and vehicle wear while maintaining coverage effectiveness.

5. GPS, Mapping & Live Tracking

Real-time GPS tracking of officers, patrols, assets, and emergency responses visible to supervisors and operations.

6. *Real-Time Financial Tracking Dashboard*

*Live per-site financial tracking with green/yellow/amber/red indicators reflecting burn rate and operational efficiency. **Phase 2***

7. Logistics & Supply Management Automation

Automated supply and equipment requests with approval routing, ordering, and delivery tracking tied to each site. ***Phase 2***

8. Vehicle Maintenance & Fuel Tracking

Officer-submitted vehicle reports, fuel logs, maintenance, and repairs automatically categorized for accounting and audits. ***Phase 2***

9. Officer Scheduling & Assignment Engine

Dynamic officer-to-post assignment linking profiles, certifications, equipment, and permissions to specific locations.

10. *Maintenance Incident & Repair Workflow*

*Damage reports generate repair tickets, authorize vendors, and track progress through client-visible stages. **Phase 2***

11. *Client In-App Billing & Payments*

*Clients view incidents, services, invoices, and submit payments directly within the platform. **Out of scope, future phase***

12. Post Orders

Centralized, editable post orders accessible to officers, supervisors, leadership, and clients (approved sections only).

13. Officer Identity, Gear & Post Readiness Display

Officer photo verification, and readiness confirmation.

14. *Automatic On-Duty Spot Report Generation*

*Automatic spot reports generated at shift start confirming presence, readiness, and equipment status. Not in scope*

15. Emergency 911 Interface

One-touch emergency activation transmitting live location and structured incident data to responders.

16. Dispatch Spot Reporting

Automatic text-based incident summaries sent to dispatch and operations for immediate awareness.

17. Predictive & Preventive Analytics

Data-driven recommendations for staffing, patrol adjustments, preventive maintenance, and cost reduction. ***Phase 2***

18. Situational Guidance & Liability Reduction Engine

Real-time guidance aligned with post orders to reduce safety risks, use-of-force errors, and civil liability. ***Future phase***

19.  Local Threat & Incident Intelligence

Hyper-local incident intelligence within approximately five miles, color-coded by recency with legal guidance. ***Future phase***

20. Persons of Interest & Trespass Intelligence

Secure tracking of persons of interest, trespassed individuals, and Metro red cards across authorized sites.

21. Cross-Company Local Intelligence Sharing

Aggregated, anonymized incident data shared among participating providers to identify emerging threats. ***Future phase***

22. Training & Certification Management (AI-Driven)

Automated license and certification tracking with AI-assisted document recognition and alerts. ***Out of scope***

23. Assignment & Project Requests

Clients request executive protection or special projects in-app. Supervisors approve, assign officers, auto-schedule shifts, update calendars, and notify clients with officer profiles and arrival details. ***Future phase***

24. Reports

## **2 Residents/clients Mobile App description**  {#2-residents/clients-mobile-app-description}

The app's purpose is to enable community Residents/clients to contact their local security team in order to report emergency situations (medical or security) as well as to ask for specific services such as property walks, package recovery, etc. 

### **2.1 Splash Screen**  {#2.1-splash-screen}

A graphic designed screen presents the app name and logo and is displayed for a few seconds during app loading. 

### **2.2 Sign In Screen**  {#2.2-sign-in-screen}

The app can be used by existing clients only. In order to enter the app, they have to enter login details first. The login is done by mobile number and 6-digits code received via SMS to the entered number. 

Note: sending the code requires a 3rd party paid service (such as Twillo).

#### **2.2.1 Approved User**  {#2.2.1-approved-user}

The existing users are identified by their mobile number. If the number belongs to an active client, the OTP is sent to his mobile number and if typed correctly, he can start using the app. 

Otherwise, an error message pops up notifying the user that the number can not be identified in the system and contact details for more information. 

#### **2.2.2 Logout**  {#2.2.2-logout}

As long as the user did not use this option, he will be kept logged in and it is not required to enter mobile number and code again. 

#### **2.2.3 Terms and Conditions & Privacy Policy**  {#2.2.3-terms-and-conditions-&-privacy-policy}

After being identified, a pop up appears with the terms and conditions of the app displayed as an HTML file in a webview. 

The user must accept the app terms of use and conditions in order to proceed. 

This waver will also include different kinds of permissions, like access to the property, recording audio/video etc.

#### **2.2.4 Access to GPS**  {#2.2.4-access-to-gps}

New users are asked to approve an access to their GPS location. If they do not approve it, they will receive a warning message saying the emergency call options will not be available for them. 

### **2.3 Main Menu**  {#2.3-main-menu}

There are two options to navigate in the app: 

1\. Navigation bar at the bottom of the screen 

2\. Side menu 

#### **2.3.1 Navigation bar**  {#2.3.1-navigation-bar}

The navigation bar is located at the bottom of the screen and contains the most common functions of the app and is accessible from all screens. The options are: 

1\. Home Screen  
2\. My Calls 

3\. My Account 

4\. More Info

5\. Post Orders 

#### **2.3.2 Side menu**  {#2.3.2-side-menu}

The More Info button opens a side menu with some additional options, which are: 

1\. Our Officers 

2\. Communication Test 

3\. Terms and conditions 

4\. About Us 

5\. Contact Us 

6\. Logout 

### **2.4 Home Screen**  {#2.4-home-screen}

The main screen is the one where the user can open new calls for emergency or concierge services. 

There are 3 main options, displayed as 3 main buttons: 

1\. Security Emergency 

2\. Medical Emergency 

3\. Concierge Services 

4\. Panic button

#### **2.4.1 Security or Medical Emergency Call**  {#2.4.1-security-or-medical-emergency-call}

When the user clicks on one of those buttons a popup appears asking him to fill in some details. The information the user entered as well as some additional information from the app are sent to the system which directs it to the currently working officers. They will receive the call in their app (detailed in section 3\) as a push message. 

##### 2.4.1.1 User details  {#2.4.1.1-user-details}

The user is asked to fill in the following details: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | :---- | ----- | :---- |
| Incident type | text | no | This is not mandatory in case of emergency calls. The user can select from a managed list of incident types For example: Fire, medical, Police |
| Description  | Text  | no | up to 200 chars |
| Voice recording  | audio  | no  | up to 1 minute. |
| Media  | button  | no  | Open the camera to take a picture or the mobile gallery to choose photos. Up to 5 images in total. |
| Video  | button  | no  | Open the camera to create a video or the mobile gallery to choose a video. Only 1 video up to 1 minute (larger files will be cut). |
| Address | text | yes | The user GPS location translated into an address by using google places.  In case the address is different, the user will be able to change it. The system should upload a map (empty map) \- so the user can pinpoint the exact location |
| Priority | dropdown | yes \- default: Urgent | Urgent Important Normal Low Question \- should we keep the priority also for emergency calls? The default is urgent…… yes |
| Start continues recording video  | buttons |  | This will start video recording |

##### 2.4.1.2 Additional Information  {#2.4.1.2-additional-information}

The emergency call is sent to the officers with the following additional information: 

| Parameter Name  | Type  | Comments |
| ----- | ----- | :---- |
| User Name  (Resident/Client) | Text / link | With an option to open the user entity (in order to see additional information if exist) |
| Call date and Time  | Date and Time  | Of opening the incident by the user. |
| Home address  | text  | the user’s home address |
| ETA  | time  | The ETA is calculated according to the officer's current location and the user address by using google maps service. |
| Call category  type | text  | security or medical. |
| Status | text | Auto populated on creation \- “New” Options: New, Assigned, Resolved. \[There is no canceled or rejected option\] |
| Last update date | date \+ hour | Populated automatically  when an incident is updated  Not editable |

When creating a new call \-

* Specify location \- a map will be uploaded (Google map, issues map). The user can search for an address, zoom in/out and pinpoint the exact location. Address must be within the property area  
* The user will be able to click “Start Recording” \-  
  * The phone camera will be initiated.   
  * The recording will end once the officer will close the call, or the user will edit rhe call and stop recording.  
  * The recording will be saved on the user mobile (not on the cloud)  
  * To check \- if technically the app can start recording without user interaction. In that case, the recording will start when the user send the call.  
* Once the user clicks “Send”, the call is opened in status “New”.  
* Calls will be automatically assigned to the closest officer, the officer will be able to accept / pass it.  
* In case push notification is active \- an information about the incident will be sent to the relevant users (defined in the notification section)

2.4.1.3 Open Emergency Call Details 

After opening a call, the home screen is changed into the incident details screen in order to enable him to track online the officer's arrival. **There is no option to open another emergency call, while there is still an emergency call open**. The client will be able to open only concierge service call only. If an emergency call is activated that should lock the system up, no further requests until the emergency is cleared. 

The parameters displayed are: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Call category  | text  | security or medical. |
| Incident type | text | If exist  |
| Incident Date and Time  | Date and  Time | Of opening the incident by the user. |
| Description  | text  | the user comments |
| Voice recording  | audio  | up to 1 minute. |
| Status  | text  | Options: New, Accepted, Resolved. \[There is no option to reject a call by an officer, or cancel it by the resident\] |
| Media  | Gallery  | images the user uploaded (if any). Clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| Video  | player  | Only 1 video up to 1 minute. |
| Officer’s name  | text  | When the status is changed to  Accepted, it means there is an  officer assigned which accepted the call. His name is displayed here. |
| ETA  | time  | The ETA is calculated according to the officer's current location and the user address by using google maps service. |
| Confirmation images  | Images/video file | The officer can upload images (up to 5\) or up to 1 minute video for  confirmation purposes.  |
| Officer’s comments  | Text  | The officer can add free text  regarding the case. |
| Documents | files | The officer/dispatch will be able to upload files like \- radio communication, body worn camera, spot report |
| Files transcriptions | Text files | Each video/audio file uploaded in the document area will be Transcribed and saved as text To be confirmed with the tech team |

Any information obtained should be stored for a minimum of 90 days to assist law enforcement officials. This information will be subpoenable by the courts. We should plan for that in advance. 

In case there are no confirmation images and Officer’s comments \- those fields should be hidden.

###### 2.4.1.3.1 Tracking  {#2.4.1.3.1-tracking}

While the incident is still open, the user can view the details he sent as well as the ETA which is updated every 1 minute. The ETA is calculated according to the current location of the officer accepting the call (detailed in chapter 3\) and the user address by using google maps service. 

###### 2.4.1.3.2 Edit an emergency call {#2.4.1.3.2-edit-an-emergency-call}

As long as the call is still opened, the user can update the following details: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | :---- | ----- | :---- |
| Description  | Text  | no |  |
| Voice recording  | audio  | no  | up to 1 minute. |
| Media  | button  | no  | Open the camera to take a picture or the mobile gallery to choose photos. Up to 5 images in total. |
| Video  | button  | no  | Open the camera to create a video or the mobile gallery to choose a video. Only 1 video up to 1 minute (larger files will be cut). |
| Stop continues recording / Start continues recording | button | no | In case the user started a recording by selecting “start recording” he will be able to stop the recording as well  YES |
| Documents | files | no | The officer/dispatch will be able to upload files like \- radio communication, body worn camera, spot report |
| Files transcriptions | Text files | no | Each video/audio file uploaded in the document area will be Transcribed and saved as text To be confirmed with the tech team |

The officers will receive a push notification regarding each update \- according to the notification settings.

The resident/client cannot cancel the emergency call after opening it.

###### 2.4.1.3.4 Closing an emergency call  {#2.4.1.3.4-closing-an-emergency-call}

The call is closed when the officer updates the call status as Resolved. 

When the officer is done, he can upload images/short video to confirm he completed the task (detailed in chapter 3). 

Closing a call will also stop the continued recording. The recording will be saved on the user’s mobile.

Closed call is moved to history (My Calls) after it is closed, with the relevant status. 

###### 2.4.1.3.5 Status Change  {#2.4.1.3.5-status-change}

The call status is updated as a result of several actions: 

| Status Name  | Change trigger  | Action |
| ----- | :---- | :---- |
| New  | When a user creates the emergency call, it is  added with status New. | The call is sent to the closet officer currently working as push  notification to their app. The officer can accept it or pass it. Once he passed it, the call will be sent to the next officer according to his location |
| Accepted  | When one of the  officers click on the “on the way” button on his app. | A push message is sent to the user, which now can see the officer’s name. |
| Resolved  | When the officer  updated in his app that the service is done. | The officer is asked to upload a confirmation image (not mandatory) and a push notification is sent to the user. |

##### 2.4.1.4 Out of Service  {#2.4.1.4-out-of-service}

If the user approves the access to his current location, when he opens the app and the system recognizes he is currently out of the system services zone (defined per community), the emergency button is disabled. It means that if the user clicks the button a popup appears with an explanation why the button does not exist and a suggestion what can he do instead. 

If the system has no access to the user’s current location, then the emergency call buttons are not available anyway. 

#### **2.4.2 Concierge Services** {#2.4.2-concierge-services}

When the user clicks on this button, the user is led to another screen with several services to choose from. The services are displayed as a list of buttons. 

##### 2.4.2.1 Service Types  {#2.4.2.1-service-types}

The possible services are: Code4 to send services types (configurable in settings)

1. Dumpsters Recovery 

2\. Welfare Check 

3\. Property Walk   
4\. Package Recovery 

5\. Package Delivery 

For each service in the list there are the following details: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Service Name  | Text  | from the list specified above. |
| Service Icon  | Icon |  |
| Info  | button  | pops up a short text explanation regarding this service. |

##### 2.4.2.2 Create a Service Call  {#2.4.2.2-create-a-service-call}

Each one of the service types lead to this screen, to create a new request. 

The user should fill in the following details: 

| Parameter Name  | Type  | Mandatory  | Comments |
| :---- | :---- | ----- | :---- |
| Description  | Text  | no |  |
| Media  | button  | no  | Open the camera to take a picture or the mobile  gallery to choose photos. Up to 5 images in total. |
| Date  | Date  | no  | The user can ask to have the service on a certain day (must be in the  future). |
| Time range (To, From)  | Time (x2)  | no  | In addition he can specify a time range during the day he would like to have the requested service. |
| Priority | Text | Yes Default is Normal | Urgent Important Normal Low |

The request is sent to the system with the following additional information: 

| Parameter Name  | Type  | Comments |
| :---- | ----- | :---- |
| Service Type  | text  | the requested service |
| User Name  | Text / link | who created the request,  The officer later will have an option to open the user information |
| Call Date and Time  | Date and Time  | of opening the call by the user. |
| Address  | text  | User’s home address |
| Last updated date | Date & Time | Will be automatically updated  |

After opening the service call, it is added to the My Calls screen according to the date of creation. 

The call details are sent to the system where the admin should associate it with a specific officer. 

### **2.4.3 Panic button** {#2.4.3-panic-button}

When a resident/client is pressing on the panic button, the system will initiate an instant, direct notification to the operation (manager).  
The message will be sent by push notification and also will pop up on the operator screen.

The call will include \-

- User name  
- User location when pressing the button  
- User current location

Once the call is sent \-

* The system will activate two-way communication, meaning the operator can respond to the message and the resident responds to that.   
* The messages will appear on the screen and will cover all different activities / options.  
* The user will be able to see the communication and update on real time  
* Only the operator can close a call generated by the panic button.

The panic call parameters: 

| Parameter Name  | Type  | Mandatory | Comments |
| :---- | ----- | :---- | :---- |
| Call type | text  | Yes | Automatically populated by the system as Panic call |
| User Name  | Text / link | Yes | Automatically populated  |
| Call Date and Time  | Date and Time  | Yes | Automatically populated, the time when the panic button was pressed. |
| Location  | text  | Yes | The user current location |
| Live location | Date & Time | No | The user current location |
| Communication | Text | No | Every comment will be captured with user came & date/time |
| Status | Text | Yes | Active/Close |

### **2.5 My Calls List and Incident Reports** {#2.5-my-calls-list-and-incident-reports}

This screen contains a list of the user’s calls \- open or history. 

The calls are displayed in one list, where the open calls are at the top and the history (closed calls) are at the bottom, separated by a line and a History title. 

#### **2.5.1 Open Calls list**  {#2.5.1-open-calls-list}

The open calls list displayed only service calls (open emergencies are displayed in the main screen). The list is sorted according to the date and time of creation, from closest to farthest (in the future). Each call in the list contains the following details: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Service Type \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| Scheduled date and time  | date and time range | displayed only if the user updated the date and time he would like to have this service. |
| Status  | text  | Options: New, Accepted, Resolved, Canceled. |
| Priority | text | Urgent Important Normal Low |
| Last update date | Date and time |  |

The user will be able to filter the list by priority and date range.

From the Calls list, the customer can navigate also to Incident Reports list, chapter 2.5.2

##### 2.5.1.1 Call Details  {#2.5.1.1-call-details}

Clicking on a call in the list leads to the call details screen with the following details: 

| Parameter Name  | Type  | Comments |
| ----- | :---- | :---- |
| Service category | icon |  |
| Service type \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. |
| Opened by (user name) | Text \+ link |  |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| Description  | text  | the user comments |
| Scheduled date and time  | date and time range | displayed only if the user updated the date and time he would like to have this service. |
| Status  | text  | Options: New, Accepted, Resolved, Canceled. |
| Priority | text | Urgent Important Normal Low |
| Media  | Gallery  | images the user uploaded (if any). Clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| Officer’s name  | text  | When the status is changed to  Accepted, it means there is an  officer associated with this service call. His name is displayed here. |
| Confirmation images  | Images/video file | The officer can upload images (up to 5\) or up to 1 minute video for  confirmation purposes. It is displayed in this part. |
| Officer’s comments  | Text  | The officer can add free text  regarding the case. |

From the call details, the client can also see Call Incident report (if exist).

By clicking “Reports” the client will be directed to Incident Reports page, filtered by the Call id (reports linked to this call) Chapter 2.5.3

##### 2.5.1.2 Edit a Call  {#2.5.1.2-edit-a-call}

As long as the call is still opened, the user can update the following details: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | :---- | ----- | :---- |
| Description  | Text  | no |  |
| Media  | button  | no  | Open the camera to take a picture or the mobile gallery to choose photos. Up to 5 images in total. |
| Date  | Date  | no  | The user can ask to have the service on a certain day (must be in the future). |
| Time range (To,  From) | Time  (x2) | no  | In addition he can specify a time range during the day he would like to have the requested service. |
| Priority | Text | yes | The user will be able to lower the priority or higher |

The assigned officer (if there is one) will receive a push notification regarding each update. 

##### 2.5.1.3 Cancel a Call  {#2.5.1.3-cancel-a-call}

The user can cancel only the Service call he opened (not an emergency call / panic button),  in case it is no longer relevant or he opened it by mistake.

In such a case, the user is asked if he is sure he wants to cancel and if so, the call is canceled. The system admin receives a notification regarding the cancellation. The associated officer (if there is one) receives a push notification regarding the cancellation. On the user’s side, the call is moved to history with status “Canceled”. 

##### 2.5.1.4 Status Change  {#2.5.1.4-status-change}

The call status is updated as a result of several actions: 

| Status Name  | Change trigger  | Action |
| ----- | :---- | :---- |
| New  | When a user creates the service call, it is added with status New. | The call is pending in the admin system to be assigned with an officer. |
| Accepted  | When the system admin associated the call with an officer. | The call details are sent to the  officer’s app. A push message is sent to the officer and user, which now can see the officer’s name. |
| Resolved  | When the officer  updated in his app that the service is done. | The officer is asked to upload a confirmation image (not mandatory) and a push notification is sent to the user. |
| Canceled  | When the user canceled the call. | A push notification is sent to the officer (if there is one), as well as a notification in the system. The call is moved to history. |

##### 2.5.1.5 Closing the call  {#2.5.1.5-closing-the-call}

The call is closed when 1 of 2 things happen: 

1\. The user canceled the call 

2\. The officer updated the call status as resolved. 

When the officer is done, he can upload images/short video to confirm he completed the task (detailed in chapter 3).   
Closed call is moved to history 24 hours after it is closed, with the status “closed”. The Canceled call is moved to history immediately. 

#### **2.5.2 History**  {#2.5.2-history}

This list displays all closed (and canceled) calls \- service calls and emergencies. The list is sorted according to the date and time of creation, from closest to farthest (in the past). 

The history should contain only calls that were closed in the last **90 days** \- this should be a parameter in the system settings. 

Each call in the list contains the following details: 

| Parameter Name  | Type  | Comments |
| ----- | :---- | :---- |
| Category \+ icon  | Text \+ icon  | “medical emergency” / “security emergency” / “concierge services”. |
| Service Type \+ icon  | Text \+ icon  | Options as listed in “open a call” chapter |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| Scheduled date and time  | date and time range | displayed only if the user updated the date and time he would like to have this service. Relevant for service calls only. |
| Status  | text  | Options: Resolved, Canceled. |

##### 2.5.2.1 Call Details  {#2.5.2.1-call-details}

Clicking on a call in the list leads to the call details screen with the following details: 

| Parameter Name  | Type  | Comments |
| ----- | :---- | :---- |
| Category \+ icon  | Text \+ icon  | “medical emergency” / “security emergency” / “concierge services”. |
| Service Type \+ icon  | Text \+ icon  |  |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| Description  | text  | the user comments |
| Scheduled date and time  | date and time range | displayed only if the user updated the date and time he would like to have this service. Relevant for service calls only. |
| Status  | text  | Options: Resolved, Canceled. |
| Media  | Gallery  | images the user uploaded (if any). clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| Audio recording  | audio  | relevant to emergencies only. |
| Video  | player  | relevant to emergencies only. |
| Officer’s name  | text  | When the status is changed to  Accepted, it means there is an  officer associated with this service call. His name is displayed here. |
| Confirmation images  | Images/video file | The officer can upload images (up to 5\) or up to 1 minute video for  confirmation purposes. It is displayed in this part. |
| Officer’s comments  | Text  | The officer can add free text  regarding the case. |
| Reaction  | button  | Like or dislike buttons |
| Comment  | text  | the user can write a comment  regarding the service. |

There is no option to edit calls in History, only add a reaction and comment. 

##### 2.5.2.1.1 Reaction button  {#2.5.2.1.1-reaction-button}

After the call is closed, the user has the option to indicate if he is pleased or not from the officer’s service (relevant for emergencies as well). There are 2 buttons: Thumb up for “like” and Thumb down for “dislike”. 

If the user clicks on “dislike”, a notification is displayed in the admin system. 

if the user clicks on “like”, it appears on the officer’s side (a push is sent to notify him). 

##### 2.5.2.1.2 Comment  {#2.5.2.1.2-comment}

After the call is closed, the user has also the option to add free text comments regarding the officer’s service (relevant for emergencies as well). Currently, only the system admin can view these comments. 

##### 2.5.2.2 Moving from Future to History  {#2.5.2.2-moving-from-future-to-history}

For emergency calls, when the call is done or canceled, it is moved to History immediately. For service calls, when the call is canceled, it is moved to History immediately while closed ones moves to history only after 24 hours. 

#### **2.5.3 Incident Reports list**  {#2.5.3-incident-reports-list}

The Incident reports are generated by officers, either directly from a call, or a standalone report as part of their daily activity.

*(For more details about reports see Report creation on Officer app, manage reports and templates on the manager portal)*

This page will present a list of all Incident reports, sent to this resident/clients (for calls he opened, or standalone report)

The list includes \-

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Report Title | Text |  |
| Site | Text | Community name. |
| Date of Incident | Date | Creation date |
| Delivered On | Date | When the report was sent to the client |
| Category | Badge | Incident / Daily Activity / Custom |
| Actions | Buttons | ‘View’ – opens the formatted report in the browser. ‘Download PDF’ – downloads the watermarked PDF. |

Clients can filter by date range. 

Search by report title is available. 

The client sees only the sections selected for client delivery; internal sections are never visible.

### **2.6 Push Messages**  {#2.6-push-messages}

Here is a summary of push messages in the app. The push messages are sent only if the user approves it. The user can disable push messages from the device's Settings screen. 

Push messages will be defined and managed by the admin in the portal setting area.

| Push message name  | When  | Who receives it |
| :---- | :---- | :---- |
| Call Accepted  | When an officer is associated with the call: for emergencies, the officer clicks on the “on the way” button. For service, the system admin  associates the call to the officer. | The user receives a push  notification regarding the status update. The officer receives a push notification regarding a new service.  Leads to the call’s details screen. |
| Call is Resolved  | When the officer changed the call’s  status to Done. | The user receives a push  notification regarding the status update.  Leads to the call’s details screen. |
| New Incident Report | When a report was sent to a client | The client that opened the call |

### **2.7 My Account**  {#2.7-my-account}

In this screen the user views his details (as taken from the system after identification). 

#### **2.7.1 My Details**  {#2.7.1-my-details}

The details are: 

| Parameter Name  | Type  | Editable  | Comments |
| ----- | :---- | :---- | :---- |
| Full Name  | text  | yes |  |
| Address  | text  | yes |  |
| Email  | Email  | yes |  |
| Phone number  | phone  | no  | It is used to identify the user in the system, therefore any change must be approved by the administration office. |
| Community name  | Text  | yes | Taken from the system during  identification. |
| Images | image | yes | In this section, every resident/client can upload up to 10 images of his  Open a camera or upload images |
| Instructions | Text | yes | Special instructions for the officers. |
| Vehicle number | Text | no | Allow number of vehicles  |

### **2.8 Officers Information**  {#2.8-officers-information}

In this screen, the user can see the list of officers currently working in his community and to read about them and their experience. 

The system will filter the officers list and present only the officers checked in. 

#### **2.8.1 Officers list \-**  {#2.8.1-officers-list--}

#### The list displays the following details per **officer**:  {#the-list-displays-the-following-details-per-officer:}

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Officer’s Full Name  | text |  |
| Title  | text |  |
| Image  | photo  | the officer’s photo |

The list is sorted by ABC of the officer’s private name. 

The list is for reading only, no further actions are allowed here. 

### **2.8.2 Officer’s Details**  {#2.8.2-officer’s-details}

When clicking on an officer in the list, the user is led to the officer’s details screen which contains the followings: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Officer’s Full Name  | text |  |
| Title  | text |  |
| Image  | photo  | the officer’s photo |
| Description  | Text  |  |

#### **2.8.3 Featured Officer**  {#2.8.3-featured-officer}

At the upper part of the screen, there is a banner which contains some special information, as the admin added. By default, there is a general banner which is part of the app’s graphic design. When the admin adds such banner (only one at a time), it has the following details: 

| Parameter Name  | Type  | Explanation |
| :---- | ----- | :---- |
| Image  | image  | The banner feature picture. |
| Description  | Text  | Free text (no special text formatting) to display under the image. |

### **2.9 Post Orders** {#2.9-post-orders}

Clients can view Post Orders for communities associated with their account only. 

This view is read-only and strictly filtered to sections marked as “Approved for Client View”.

* Only Published Post Orders are visible to clients.  
* Only sections with “Client-Visible” set to Yes are shown.  
* The client can see the Post Order name, current version number, and effective date in the header.  
* The client cannot edit post orders.  
* The client will see a list of the post order and select a post order to open and view

### **2.10 Communication Test**  {#2.10-communication-test}

In case the admin enabled this option to the resident/client, he is able to perform a communication test with him. The communication text is similar to an emergency call. The resident/client fills in the same details and the call is sent to the admin system. It is not sent to the officers. 

The call is received in the Calls Table in the admin system as an emergency call from this resident/client, but the call type is Test. Also detailed in chapter 4\. 

### **2.11 Other Menu Options**  {#2.11-other-menu-options}

The side menu contains several general options, as described next. 

#### **2.11.1 Term of Use**  {#2.11.1-term-of-use}

This option opens a popup with the Terms of use text. The text is fixed in the app, but can be changed from time to time. 

#### **2.11.2 About Us**  {#2.11.2-about-us}

Short text regarding the app and the owner, including contact details. Also, the app's current version will be displayed at the top of the screen

#### **2.11.3 Contact Us**  {#2.11.3-contact-us}

Clicking on this option, opens a new email in the device default email app with the system admin email address already filled in and the user’s details in the subject: 

“A message from the app user: \[User Name\], \[Phone\]”   
The user will have to complete the message content and send the email. The email is sent to the admin email address and will not be handled in the management system. 

## **3 Officer Mobile Application Description**  {#3-officer-mobile-application-description}

This app's purpose is to enable the officers to 

- Receive emergency calls from residents/clients   
- Receive a service call details from the system admin.  
- Open a maintenance report (task).  
- Report when he starts and ends the shift, so the system is able to track his location and in case of emergency be able to calculate ETA to the user.   
- Officers should be able to create a call as well as complete a report for work that was completed  
- 

### **3.1 Splash Screen**  {#3.1-splash-screen}

A graphic designed screen presents the app name and logo and is displayed for a few seconds during app loading. 

**3.2 Sign In Screen** 

The app can be used by existing officers only. In order to enter the app, they have to enter login details first. The login is done by mobile number and 6-digits code received via SMS to the entered number. 

Note: sending the code requires a third party paid service (such as Twilio). 

#### **3.2.1 Approved User**  {#3.2.1-approved-user}

The existing officers are identified by their mobile number. If the number belongs to an active officer, the OTP is sent to his mobile number and if typed correctly, he can start using the app. 

Otherwise, an error message pops up notifying the user that the number can not be identified in the system and contact details for more information. 

#### **3.2.2 Logout**  {#3.2.2-logout}

As long as the user did not use this option, he will be kept logged in and it is not required to enter mobile number and code again. 

#### **3.2.3 Terms and Conditions & Privacy Policy**  {#3.2.3-terms-and-conditions-&-privacy-policy}

After being identified, a pop up appears with the terms and conditions of the app displayed as an HTML file in a webview. 

The officer must accept the app terms of use and conditions in order to proceed. 

#### **3.2.4 Access to GPS**  {#3.2.4-access-to-gps}

After first login, the officers are asked to approve an access to their GPS location. This is mandatory, they cannot continue to use the app without it. Therefore, if an officer does not approve it, he will receive an error message explaining the issue. 

### **3.3 Main Menu**  {#3.3-main-menu}

There are two options to navigate in the app: 

1\. Navigation bar at the bottom of the screen 

2\. Side menu 

#### **3.3.1 Navigation bar**  {#3.3.1-navigation-bar}

The navigation bar is located at the bottom of the screen and contains the most common functions of the app and is accessible from all screens. The options are: 

1\. Home Screen \- My Calls \+ Panic button \+ Incident report (to be decided in the design if IR should appear here or with Maintenance report

2\. Maintenance reports (list of reports \+ create new) 

3\. Check-in/out 

4\. Calls and Reports History

5\. My Shifts

6\. Resident search

7\. Post Orders

8\. Person of Interest and Trespass

#### **3.3.2 Side menu**  {#3.3.2-side-menu}

At the upper bar there is menu button which opens a side menu with some additional options, which are: 

1\. My Account 

2\. Terms and conditions 

3\. Logout 

### **3.4 Main screen \- My Calls** {#3.4-main-screen---my-calls}

The main screen is a list of all service calls associated with this officer. 

Also in this screen \-

- A link to Incident reports list  
- An option to generate new Incident report: linked to specific call (from the call page), or stand alone report

#### **3.4.1 Open Calls list**  {#3.4.1-open-calls-list}

The list contains mostly service calls which are sorted by scheduled date and time, from closest to farthest (in the future). Each call in the list contains the following details: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Calls category \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1 & 2.4.3 |
| Service type | Text |  |
| resident/client’s Name  | Text |  |
| Address  | text  | The reported address |
| Scheduled date and time  | date and time  | The time the user set when he opened the call or the time the admin set when he associated it with this  officer. |
| Priority | text | Urgent Important Normal Low |
| Status  | Text  | Options: New, Accepted, Resolved, Canceled. |

- Filters: by open calls, completed calls for the previous 7 days, category and type.  
- The list will be ordered by the call dates.   
- Search: the user will be able to search a call by description.

##### 3.4.1.1 Call Details  {#3.4.1.1-call-details}

Clicking on a call in the list leads to the call details screen with the following details: 

| Parameter Name  | Type  | Comments |
| ----- | ----- | :---- |
| Call Category \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. |
| Service/Incident type | Text | Options as listed in 2.4.2.1 |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| Resident/client’s Name  | Text \+ link | Link to the users details |
| Address  | text  | The resident/client’s home address, with an option to see it on a map |
| Description  | text  | the user comments |
| Scheduled date and time  | date and time  | The time the user set when he opened the call or the time the admin set when he associated it with this  officer. |
| Status  | text & button  | Options: Accepted. The button  changes the status to Resolved. |
| Priority | text | Urgent Important Normal Low |
| Media  | Gallery  | Images the user uploaded (if any). Clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| Confirmation images  | Images/video file | The officer can upload images (up to 5\) or up to 1 minute video for  confirmation purposes. It is displayed in this part. |
| Officer’s comments  | Text  | The officer can add free text  regarding the case. |

The office will be able to \-

1. Click on the user name \- the system will open a window with the user details:   
   1. Resident/.client name  
   2. Phone number  
   3. Images \- in case the customer uploaded images of his property  
   4. Additional information \- any special instructions the resident/client added.  
2. Click on map view \- to see the property and indications

##### 3.4.1.2 Edit a Call  {#3.4.1.2-edit-a-call}

As long as the call is still opened, the user can update the call. The officer receives a push message for each update. However, there are few parameters the officer can edit: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | ----- | ----- | ----- |
| Status  | Text  | yes  | Can change from Accepted to Done. |
| Confirmation  images | Images  /video  file | no  | Open the camera to take a picture or the mobile gallery to choose photos. Up to 5 images in total.  He can also upload up to 1 min. video. |
| Officer’s  comments | Text  | no  | The officer can add free text regarding the case. |

When the officer changes the call’s status to Resolved, he is asked to upload confirmation photos and to add details in the comments. It is not mandatory. When the call status is changed, a push notification is sent to the resident/client. 

##### 3.4.1.3 New Calls  {#3.4.1.3-new-calls}

When a new service call is assigned to this officer by the system admin, the officer receives a push notification which leads to the call’s details screen. The new call is added to the main screen according to its scheduled date and time (with status Accepted). 

##### 3.4.1.4 Canceled Call  {#3.4.1.4-canceled-call}

If the resident/client canceled his call, the officer receives a push notification which leads to the call’s details screen. The call is moved from the main screen to the Call History screen. 

##### 3.4.1.5 Closing the call  {#3.4.1.5-closing-the-call}

The call is closed when 1 of 2 things happen: 

1\. The resident/client canceled his call 

2\. The officer updated the call status as Done. 

When the officer is done, he can \-

3. upload images/short video to confirm he completed the task (as detailed above).   
4. Add comment  
5. Upload files \- like radio communication, body worn camera \- those will be probably uploaded by the manager after closing the call  
6. Share incident \-  
   1. Share to email \- the email will include a link to the incident (only users will be able to access the call details), location, description, comments, pictures uploaded. (To be confirmed by the tech team)  
   2. Export incident \- create an excel with the following details: type, description, location, comments, images.

Closed call is moved to history 24 hours after it is closed, with the status “Done”. The Canceled call is moved to history immediately. 

#### **3.4.2 Security or Medical calls**  {#3.4.2-security-or-medical-calls}

When a new emergency call is opened by a resident/client in the same community as the officer and the officer has checked in to work (currently), he receives a push notification that leads to the call’s details screen. 

In addition, a notification pops up on the app screen, which leads to the same call’s details screen. 

3.4.2.1 New emergency call

The call is added to the main list at the top. It is added with status New and therefore it is highlighted in Red. 

##### 3.4.2.2 Emergency call Details  {#3.4.2.2-emergency-call-details}

The call details are: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Call Category  | text  | security or medical. |
| Incident type | text | From a list |
| resident/client’s Name  | Text \+ link |  |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| Description  | text  | the user comments |
| Address  | text  | GPS location translated into an  address by using google places. |
| Home address  | text  | the user’s home address |
| ETA  | time  | The ETA is calculated according to the officer's current location and the user address by using google maps service. It is not sent to the resident/client as long as the officer didn’t accept the call. |
| User’s Voice recording  | audio  | up to 1 minute. |
| Status  | text & button  | Options: New, Accepted. If the status is New, the button changes it to accepted. If the status is accepted it changes it to done. |
| User Media  | Gallery  | images the user uploaded (if any). clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| User Video  | player  | Only 1 video up to 1 minute. |
| Officer’s name  | text  | When an officer accepts the call, the status is changed to Accepted. His name is displayed here. |
| Confirmation images  | Images/video file | The officer can upload images (up to 5\) or up to 1 minute video for  confirmation purposes. It is displayed in this part. |
| Officer’s comments  | Text  | The officer can add free text  regarding the case. |
| Documents  | files | This will be added **after** the call is handled, not in this stage. For example: police report, radio communication, etc |
| Document transcriptions | Text files | This will be added automatically for video & audio documents uploaded after the call is handled. To be confirmed with the tech team |

##### 3.4.2.2.1 Accepting the Call  {#3.4.2.2.1-accepting-the-call}

1. As long as the call is in New status, 2 buttons will appear for the officer \- “On the way” or “Pass”:  
- Once the officer Accept the call:   
  - The call changes its status to Accepted  
  - The call color is changed to Blue.   
  - The call stays in the list as long as it is not done. When the associated officer changes it to Resolved, it is removed from the list. For the associated officer it is moved to history.   
- Once the officer Pass the call:  
  - The call is sent to all the other currently working officers (in the community) with an option to Accept \- appears on screen and by push notification.  
  - Once an officer Accept it, the call color is changed to blue  
  - The call stays in the list of calls until it’s closed.

2. Once an Officer accept the call \-  
- The call is assigned to this user  
- A push message is sent to the resident/client.   
- The officer’s name is displayed in the call’s details.   
- The call color is changed to Blue.   
- These changes are displayed for all receiving officers. 

The ETA is calculated according to the associated officer and is displayed to the resident/client as well as to all receiving officers. 

3. In order to get additional information about the call, the officer will be able to:  
1. Click on the user name \- the system will open a window with the user details:   
   1. Resident/.client name  
      2. Phone number  
      3. Images \- in case the customer uploaded images of his property  
      4. Additional information \- any special instructions the resident/client added.

2\. Click on the map button \- to view the property and indications

4\. Calling 911 \- 

On certain calls, the officer might need to involve 911\. 

- By clicking “Call 911” button the app calls 911 where the officer can provide them with all the details.  
- By “Texting 911” \- Send an emergency text to 911: transmit the officer’s live location, provide essential distress information

TBD \- are there API to 911, so Code4 can initiate a call automatically, or it’s only by an active call?  
The call will be documented in the comments field (a call was generated on date and time X)

##### 3.4.2.2.2 Tracking  {#3.4.2.2.2-tracking}

While the call is still open, the resident/client can view the details he sent as well as the ETA which is updated every 1 minute. The ETA is calculated according to the current location of the officer accepting the call and the resident/client’s current location address by using google maps service. 

##### 3.4.2.3 Edit a Call  {#3.4.2.3-edit-a-call}

As long as the call is still opened, the user can update the call. The officer receives a push message for each update. However, there are few parameters the associated officer can edit: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | ----- | ----- | ----- |
| Status  | Text  | yes  | Can change from Accepted to Resolved. |
| Confirmation  images | Images  /video  file | no  | Open the camera to take a picture or the mobile gallery to choose photos. Up to 5 images in total.  He can also upload up to 1 min. video. |
| Officer’s  comments | Text  | no  | The officer can add free text regarding the case. |
| Document | file | no | This will be added after the call is handled, not in this stage. Examples: police report, radio communication, body worn camera This will not be visible to the resident. |

When the officer changes the call’s status to Resolved, he is asked to upload \-

- Confirmation photos  
- Add details in the comments.   
- Add files, like a Police report if it exists.

Those are not mandatory for closing the call.  When the call status is changed, a push notification is sent to the resident/client. 

##### 3.4.2.4 Closing the call  {#3.4.2.4-closing-the-call}

The call is closed when 1 of 2 things happen: 

1\. The user canceled the call   
2\. The officer updated the call status as resolved. 

When the associated officer is done, he can upload images/short video to confirm he completed the task, and add files like a Police report if it exists (as detailed above).

Closed call is moved to history after it is closed, with the relevant status. 

#### **3.4.3 Filters and search** {#3.4.3-filters-and-search}

The officer is able to filter the calls list by: 

1\. Date range \- Today (default), Tomorrow, This week, Next week, Custom dates 2\. resident/client’s name 

3\. Category

4\. Type 

5\. Priority

Search: the user will be able to search a call by description and customer name.

#### **3.4.4 Create an Incident Report** {#3.4.4-create-an-incident-report}

A report can be created in two ways:

| Origin | Description |
| :---- | :---- |
| *Call Page* Incident-linked  | Created directly from an open emergency or service call. The report is pre-populated with the call details (date, time, type, resident/client name, GPS address, etc \- according to the template settings) |
| *Reports Page* Standalone (daily activity) | Created independently of any call. The officer selects the report template and fills it in manually. |

The officer clicks “Write a Report” button and follow the steps \-

1. Select Template from the templates list \-   
   1. Filtered: only Active templates  
   2. The list will display: Template name and Report category  
2. Select a Call (not mandatory) \-  
   1. If the report is generated from the call page, this field will be populated automatically  
   2. If the report is generated from the reports list (not recommended), the officer will be able to select a call, the list will display call ID, title, create date, resident  
3. In case the report is linked to a call, all relevant fields will be retrieved and auto populated from the call entry. The officer will complete the remaining custom fields (defined in the template)  
4. In case the report is a stand alone report, the officer will have to manually populate all fields.  
5. The officer can save the report without saving \- report will be saved as “Draft”  
6. The officer submits the report \- Report status is changed to Submitted.  
7. In case the report can be sent to the client without approval (according to the template’s settings) \- the report status will be changed to “Delivered”, the report will be automatically sent to the client, the system will format the report, see chapter 4.4.7.4.

Note: A call can have multiple reports attached to it (e.g. initial incident report plus a follow-up report the next day). Each report is listed in the call’s detail screen.

#### **3.4.5 Report Life Cycle**  {#3.4.5-report-life-cycle}

A report passes through the following statuses from creation to delivery:

| Status Name | Change Trigger | Action |
| :---- | :---- | :---- |
| Draft | The officer starts a report and has not yet submitted it | Visible only to the creating officer. Not visible to managers. The officer can save progress and return to complete it later. |
| Submitted | Officer taps ‘Submit Report’ | Report is locked for officer editing (unless Allow Officer Editing After Submit is On for this template). The manager is notified. If Review Before Client is Off for this template/site, the report moves directly to Approved and can be sent to the client.  If Review Before Client is On, it enters the review queue. |
| Under Review | A manager opens the report to review it (applicable when Review Before Client is On). | Report is held in the manager’s review queue. Officer receives a notification that their report is being reviewed. The manager can edit, add sections, or request changes. |
| Changes Requested | Manager sends the report back to the officer with comments. | Officer receives a push notification with the manager’s comments. Officer can edit the report and resubmit. The report re-enters Under Review. |
| Approved | Manager approves the report  | Report is finalised. It can now be delivered to the client. Push notification sent to the officer. The report is added to the site’s report history. |
| Delivered | Manager clicks ‘Send to Client’ from an Approved report. | The client receives a notification and can view the report in their portal. The delivery is logged with timestamp and manager name. The report can no longer be edited. |

#### **3.4.6 Review and Edit reports**  {#3.4.6-review-and-edit-reports}

The Reports tab in the shows a list of all reports created by the officer, sorted by most recent first. Each entry displays:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Report Title | Text | Generated from the template’s title format. |
| Template Name | Text | The template used. |
| Date Created | Date | When the officer started the report. |
| Status | Badge | Draft Submitted Under Review Changes Requested  Approved Delivered. |
| Source Call ID | Link | Shown for incident-linked reports. Links to the call record. |

Tapping a report opens a read-only view of the submitted content. If the status is ‘Changes Requested’, the manager’s comments are shown at the top in a highlighted block and the officer can tap ‘Edit & Resubmit’.

### **3.5 Panic button** {#3.5-panic-button}

When an officer is pressing on the panic button, the system will initiate an instant, direct notification to the operation (manager).  
The message will be sent by push notification and also will pop up on the operator screen.

The call will include \-

- User name  
- User location when pressing the button  
- User current location

Once the call is sent \-

* The system will activate two-way communication, meaning the operator can respond to the message and the resident responds to that.   
* The messages will appear on the screen and will cover all different activities / options.  
* The user will be able to see the communication and update on real time  
* Only the operator can close a call generated by the panic button.

The panic call parameters: 

| Parameter Name  | Type  | Mandatory | Comments |
| :---- | ----- | :---- | :---- |
| Call type | text  | Yes | Automatically populated by the system as Panic call |
| User Name  | Text / link | Yes | Automatically populated  |
| Call Date and Time  | Date and Time  | Yes | Automatically populated, the time when the panic button was pressed. |
| Location  | text  | Yes | The user current location |
| Live location | Date & Time | No | The user current location |
| Communication | Text | No | Every comment will be captured with user came & date/time |
| Status | Text | Yes | Active/Close |

### **3.6 Check-in/out**  {#3.6-check-in/out}

When an officer starts his shift for the day, he must click on the Check-in button, so the system will know he is currently working and so he is able to receive calls. For the same reason, when he finishes the shift, he must click on the check-out button. 

#### **3.6.1 Check-in/out**  {#3.6.1-check-in/out}

There is a large button on the screen for Check-in, which is changed to Check-out after clicked on. 

When the officer checks-in, a timer starts to run to summaries his total working hours until he checks-out. 

When the officer checks-out, the total hours he worked today are added to the table below. 

When the officer checks in, the system presents his post for this shift, including \-

- Description and location  
- A link to the post order  
- In case additional officers are assigned to this post, present the officer name

#### **3.6.2 Hours list**  {#3.6.2-hours-list}

Below the check-in/out button, there is a table of hours this officer worked. Currently this is just a simple list which is sorted by date and check-in time. For each line in the list there are the following details: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Date  | Date  | date of check-in |
| Check-in time  | time  | when he clicked on check-in button |
| Check-out time  | time  | when he clicked on check-out button |
| Total hours  | float  | total number of hours he worked in decimal number. |

Currently there is no option to edit the list or delete anything from the list. 

### **3.7 Calls History**  {#3.7-calls-history}

This list displays all closed and canceled calls \- service calls and emergencies, which are associated with this officer. The list is sorted according to the date and time of scheduling (for services) or association (for emergency), from closest to farthest (in the past). 

The history will display the calls in the **last 90 days** (this should be a parameter defined by the admin)

#### **3.7.1 Calls List**  {#3.7.1-calls-list}

Each call in the list contains the following details: 

| Parameter Name  | Type  | Comments |
| ----- | ----- | :---- |
| Category \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. as well as “medical emergency” and “security emergency” types. |
| Incident type | text |  |
| resident/client’s Name  | text |  |
| Address  | text  | The resident/client’s home address |
| Scheduled date and time  | date and time  | The time the user set when he opened the call or the time the admin set when he associated it with this  officer. Or the time the officer clicked on “on the way” for  emergencies. |
| Status  | text  | Options: Resolved, Canceled. |

#### **3.7.2 Call Details**  {#3.7.2-call-details}

Clicking on a call in the list leads to the call details screen with the following details: 

| Parameter Name  | Type  | Comments |
| :---- | ----- | :---- |
| Category \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. as well as “medical emergency” and “security emergency” types. |
| Incident type |  |  |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| resident/client’s Name  | text |  |
| Address  | text  | The resident/client’s home address |
| Current address  | text  | relevant for emergencies, the  resident/client’s current location |
| Description  | text  | the user comments |
| Scheduled date and time  | date and time  | The time the user set when he opened the call or the time the admin set when he associated it with this  officer. Or the time the officer clicked on “on the way” for  emergencies. |
| Status  | text  | Options: Done, Canceled. |
| Media  | Gallery  | images the user uploaded (if any). Clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| Audio recording  | audio  | relevant to emergencies only. |
| Video  | player  | relevant to emergencies only. |
| Confirmation images  | Images/video file | The officer can upload images (up to 5\) or up to 1 minute video for  confirmation purposes. It is displayed in this part. |
| Officer’s comments  | Text  | The officer can add free text  regarding the case. |
| Documents  | files | For example: police report, radio communication, etc |
| Document transcriptions | Text files | This will be added automatically for video & audio documents uploaded. To be confirmed with the tech team |
| Like Reaction  | icon  | if the resident/client clicked on the Like button. |

There is no option to edit calls in History but adding documents.

Share incident option \-

1. Share to email \- the email will include a link to the incident (only users will be able to access the call details), location, description, comments, pictures uploaded. (To be confirmed by the tech team)  
2. Export incident \- create an excel with the following details: type, description, location, comments, images.

#### **3.7.3 Moving from Future to History**  {#3.7.3-moving-from-future-to-history}

For emergency calls, when the call is done or canceled, it is moved to History immediately (only for the associated officer). For service calls, when the call is canceled, it is moved to History immediately while closed ones moves to history only after 24 hours. 

#### **3.7.4 Filters and Search** {#3.7.4-filters-and-search}

The officer is able to filter the calls list by: 

1\. Date range \- Today (default), Tomorrow, This week, Next week, Custom dates 2\. resident/client’s name   
3\. Service type 

Search: the user will be able to search a call by description and customer name.

### **3.8 Maintenance reports** {#3.8-maintenance-reports}

In this tab, the officer will be able to see all open maintenance reports and open a new one.

#### **3.8.1 Create a new task (maintenance report)** {#3.8.1-create-a-new-task-(maintenance-report)}

Each new  task will include:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Task type | dropdown list | yes | choose from a managed list \-  Examples \-lights, sprinklers, leaks,damaged property Maintenance Inspection required Damaged equipments Operational report Supply Request |
| Description | text | yes | up to 200 chard |
| Media | Upload button | no | Open the camera to take a picture or the mobile gallery to choose photos. Up to 5 images in total.  |
| Video | Upload button | no | Open the camera to create a video or the mobile gallery to choose a video. Only 1 video up to 1 minute (larger files will be cut).  |
| Priority | dropdown | yes \- default: low | Urgent Important Normal Low |
| Address | text | no |  |
| Assigned to | username | yes | The officer can select a user from a list of users (with autocomplete option) The default assignee is a manager user. Note \- in case there are few users, we will have to define the specific user the ticket should be assigned to |
| Document | file | no |   |

#### 

When generating a task \-

- After saving the information, the task will be generated and added to My tasks list  
- The task is sent to the management with the following **additional** information:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Task ID | text | yes | auto created A unique identifier |
| Date and Time | date \+ hour | yes | Populated automatically  The date of opening the task Not editable |
| User name | text | yes | Populated automatically, the officer that opened the task |
| Status | dropdown | yes | auto populated on creation \- “New” Options: New, Accepted, Approved, Completed, Rejected, Canceled. |
| Assigned to | username | yes |  |
| ETA | time | no | The ETA will be provided manually by the manager |
| Last update date | date \+ hour | yes | Populated automatically  In this stage will be similar to creation date Auto updated whenever a the task is updated Not editable |
| Confirmation images | Images/video file | no | In this stage will be empty |
| Assignee’s comments | Text | no | In this stage will be empty  |

After opening a task, the user gets an acknowledgement \- task was sent, and he’s directed to My tasks page.

#### **3.8.2 Open Tasks list (maintenance report)** {#3.8.2-open-tasks-list-(maintenance-report)}

When the officer opens this page he will see all available tasks, the page includes:

* Tasks list  
* Add New option

The initial task list includes only Open tasks (status: New, Accepted, Assigned), sorted by creation date, with an option to sort by priority.  
The officer can either see all only tasks that are assigned to him or generated by him.  
TBD \- if we would like to present all officers' tasks.

Each task on the list includes the following fields:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Task ID | text | auto created A unique identifier |
| task type | dropdown list | choose from a list \-  Examples \- Lights, sprinklers, leaks,damaged property Maintenance Inspection required Damaged equipments Operational report Supply Request |
| Description | text | up to 200 chard |
| Priority | dropdown | Urgent Important Normal Low |
| Date and Time | date \+ hour | Populated automatically  The date of opening the task Not editable |
| Created by | text | The user name that opened the task |
| Status | dropdown | auto populated on creation \- “New” Options: New Accepted Approved (if needed) Rejected Completed Canceled |
| Assigned to | username |  |

#### 

- The page can be filtered by:   
* Task types  
* Tasks status: Open / Closed  
* Task creation dates: date range picker  
* Assign to me / all  
* Priority  
- Free text search should be available, it will search on the title, description and user fields.  
- Each task item will be followed by the quick actions: (To be decided by design whether to keep it as a quick action or allow those activities only after opening the task details)  
* View → direct the user to the task window  
* Accept → the task should be assigned to a user  
* Reject → the rejection reason should be added in the answer field  
* Completed → the resolution should be added in the comments as well as images if needed

  In every action, the status of the task should be updated, push notification should be sent. 

###  **3.8.3 Handling a task**  {#3.8.3-handling-a-task}

The officer can select a task from a list, review the task’s details and take actions in case the task is assigned to him.

(Note \- Most of the tasks will be handled by a manager, see chapter 4.6.3)

The page includes:

* Task information  
* Status change button

The officer can then \- 

* Edit task details \- add description, images, documents  
* Accept task \-   
  * The task status is changed to Accepted  
  * The assignee field will be updated with the username that accepted the task  
* Complete task  \-   
  * The user can add a comment, and resolution image if needed  
  * The task status is changed to Completed. The task is closed.  
* Reject the task \-  
  * Add comment \- rejection reason  
  * The task status is changed to Rejected. The task is closed.  
* Reassign the task to another user  
* Update the comments field, add image, add document.  
* Cancel a task \- a user can cancel a task he created, as long as the task is still open (status New)

After performing the activities above and save the information \-

* The task “last update date” is updated  
* In case push notification is active \- the assignee and the user that opened the task will get a notification about the task.

##### 3.8.3.1 Closing the task  {#3.8.3.1-closing-the-task}

The task is closed when 1 of 3 things happen: 

1\. The one that opened the task canceled his task 

2\. The assignee updated the task status as Completed.

2. The assignee updated the task  status as Rejected.

When the officer is done, he can upload images/short video / documents to confirm he completed the task (as detailed above). 

The closed task is moved to history 24 hours after it is closed. The Canceled call is moved to history immediately. 

### **3.9 Push Messages**  {#3.9-push-messages}

Here is a summary of push messages in the officer’s app. The push messages are sent only if the user approves it. The user can disable push messages from the device's Settings screen. 

| Push message name  | When  | Who receives it |
| :---- | :---- | :---- |
| New Emergency call  | When the user  creates a new  emergency call. | All currently working officers (in the same community) receive a push message.  Leads to the emergency call details screen. |
| New service call  | When the user  creates a new service call and the admin associates it with an officer. | The associated officer  receives a push notification.  Leads to the service call details screen. |
| Call update  | When the user  makes any changes in service or  emergency call. | If the call is associated with an officer he receives a push notification. For emergencies, if there is no associated officer yet, all currently working  officers receive a notification (in the same community).  Leads to the call details screen. |
| Canceled call  | When the user  canceled the service call. | If the call is associated with an officer he receives a push notification. For emergencies, if there is no associated officer yet, all currently working officers receive a notification (in the same community)..  Leads to the call details screen. |
| resident/client Like  | When the resident/client clicks on the Like  button. | The associated officer  receives a push notification regarding the Like update \+ leads to the call’s details screen. |
| Incident Report Approved | When a manager approves a report | The officer that generated the report |
| Incident Report Requires changes | When a manager rejects  a report (requires changes) | The officer that generated the report |

### **3.10 Search for resident** {#3.10-search-for-resident}

The guard should be able to search for a resident and get the resident details.

The search should be on the following fields \-

- Name  
- License Plate Number  
- Address

The system will present the resident details \-

- Full Name  
- Address  
- Mobile number  
- Vehicles license plates

### **3.11 My Shifts and Routes** {#3.11-my-shifts-and-routes}

In this page the officer can see his shifts and routes. 

1. **Shifts** **display** \- shifts will be listed and sorted according to shift date.  
- Only published shifts that assigned this officer will be presented, with an option to See all \-. Question: so we want to present to the officer all shifts (not only his)  
- The officer can enter the shift and see the shift details, that includes all parameters listed in the Shift management chapter  
- Post assigned to him in each shift

2. **Route display** \- when a patrol route is attached, the officer can view the route from the Shift Details screen in their app. 

- The route is displayed as an interactive map with numbered pins at each waypoint.  
- While on shift, the officer's current GPS position is shown in real time. As the officer arrives at a waypoint (within a configurable radius, default: 50 m), the app:  
* Marks the waypoint as visited.  
* Displays the dwell-time countdown.  
* After the dwell time expires, navigate automatically to the next waypoint.

The officer can also tap 'Mark as Visited' manually if GPS accuracy is insufficient.

Note: *Navigation instructions are provided via the device's default maps application (Google Maps or Apple Maps). The app deep-links to the maps app with the next waypoint as the destination.*

3. **Route Compliance Tracking** \-

The system logs each waypoint visit (timestamp, GPS coordinates at time of visit, deviation from planned route). This data is used for:

* Real-time compliance display in the Dashboard Live Tracking view (see Live tracking chapter).  
* Post-shift route compliance report (percentage of waypoints visited, average dwell time vs. planned).  
* Feeding back into the AI engine to improve future route recommendations.

### **3.12 Post Orders**  {#3.12-post-orders}

This tab includes a listing of all Post Orders for posts the officer has been allocated to in the last 90 days.

#### **3.12.1 Post Orders list** {#3.12.1-post-orders-list}

The Post Orders tab in the navigation bar shows a list of published Post Orders relevant to the officer.

Each entry in the list displays:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Post Name | Text | Name of the post the order belongs to. |
| Community | Text |  |
| Version | Text | Active version (e.g. 2.1). |
| Last Updated | Date | Date of the most recent published change. |
| Acknowledged | Badge | Green “Acknowledged” or amber “Pending” for the current version. TBD if needed |

The list is filtered to show only Post Orders for posts the officer has been allocated to in the last 90 days. Archived Post Orders are not shown.

#### **3.12.2 Post Order view** {#3.12.2-post-order-view}

On selecting one Post Order, the document the Post Order is displayed as a scrollable document with section headings acting as collapsible panels. 

All sections are shown. The following information is displayed:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Post Order Header | Summary | Post name, version number, effective date, and status   |
| Section List | Collapsible | All sections listed in order. Each section can be expanded to read the body text and view attachments. |
| Attachments | Inline viewer | PDF attachments open in an in-app viewer.  Images display inline.  Videos play in the in-app video player (up to 1 minute). |

#### **3.12.3 Offline Access \-** TBD if needed  {#3.12.3-offline-access---tbd-if-needed}

The Post Order for any post in an upcoming or active shift is automatically cached on the officer’s device when the shift is published (requires a network connection at that point). The cached version is accessible offline during the shift. If the Post Order is updated while the officer is offline, the update is downloaded and a notification displayed when connectivity is restored.

*Cached Post Orders are stored in the app’s local storage and are cleared 24 hours after the shift ends, or when the officer logs out, whichever comes first. (?)*

#### **3.12.4 Acknowledgement flow \-** TBD if needed  {#3.12.4-acknowledgement-flow---tbd-if-needed}

### **3.13 POI & Trespass**  {#3.13-poi-&-trespass}

This tab includes a listing of all POI, Trespass and Metro red card. The officer can review the list and view the records details.

#### **3.13.1 POI & Trespass list** {#3.13.1-poi-&-trespass-list}

This tab includes all Active records for the officer’s current community.   
The list is sorted by threat level (Critical first) then by most recently updated.

Each entry in the list displays:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Photo (thumbnail) | Image | First uploaded photo. |
| Name | Text | Full name and known aliases. |
| Record Type | Badge | POI / Trespass / Metro Red Card.  Colour-coded. |
| Threat Level | Badge | Low / Medium / High / Critical.  Colour-coded. |
| Summary | Text | Description entered by the manager  |
| New / Updated | Badge | A ‘NEW’ or ‘UPDATED’ badge is shown if the officer has not yet viewed this version of the record. |

The officer can filter the list by:

* Record Type  
* Threat Level  
* Search by name or alias (free text)

Officers cannot create, edit, or delete records, the list is read-only. 

The officer can select one record and open for details review

#### **3.13.2 POI & Trespass details** {#3.13.2-poi-&-trespass-details}

This view shows all officer-facing fields. Manager-only fields (Internal Notes, legal documents) are never shown. The detail view displays:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Photo Gallery | Images | All uploaded photos displayed as a swipeable gallery. The first photo is shown full-width at the top of the screen. Tapping a photo expands it to full-screen for clearer identification. |
| Name & Aliases | Text | Full name and all known aliases. |
| Record Type & Threat | Badges | Type badge and threat level badge shown prominently. |
| Physical Description | Text | Height, build, distinguishing features as entered by the manager. |
| Summary | Text | The manager-authored summary of why the individual is flagged. |
| Response Guidance | Text block | System-generated guidance based on record type (according to admin settings) |
| Sites Active On | Text list | The communities where this record is currently active. |
| Effective Date | Date | Date the record became Active. |
| Expiry Date | Date | Shown for Trespass and Metro Red Card records only. Highlighted if within 14 days. |
| Related Incidents | Links | Links to related incident records. Tapping opens the Call Details screen |

- Each record detail section will be followed by a guidance block. The guidance text is determined by the record type and is set by the Admin.   
- When an officer observes a flagged individual on site, they can create an incident report directly from the POI record detail screen by tapping the ‘Report Encounter’ button. This pre-populates a new incident with:  
* The individual’s name and Record ID in the description field.  
* The record type as the incident category.  
* The officer’s current GPS location as the incident address.

The officer then completes the incident report as normal. The resulting incident record is automatically linked to the POI record as a Related Incident.

### **3.14 My Account**  {#3.14-my-account}

In this screen the officer views his details (as taken from the system after identification). 

#### **3.14.1 My Details**  {#3.14.1-my-details}

The details are: 

| Parameter Name  | Type  | Editable  | Comments |
| ----- | :---- | :---- | :---- |
| Full Name  | text  | yes |  |
| Title  | text  | no  | Taken from the system during  identification. |
| Address  | text  | yes |  |
| Email  | Email  | yes |  |
| Phone number  | phone  | no  | It is used to identify the user in the system, therefore any change must be approved by the administration office. |
| Community name  | Text  | no  | Taken from the system during  identification. |
| Picture | image | no |  |

The officer will be able to edit his details \- upload or edit his picture, but opening a camera and taking a picture, or open the media gallery and select one.

## 

## **4 Management System Description \- Manager (Operator) View** {#4-management-system-description---manager-(operator)-view}

The system enables the management of the communities and their residents/clients, as well as the officers within each community. In addition, the operator receives the service calls and assigns them to relevant officers. 

### **4.1 General Management**  {#4.1-general-management}

· System login is done via email and password (the email he registered to the system with).   
· The available functionality in the system is according to the user role and permissions (defined by the admin). This system view is for managers only.

#### **4.1.1 Main menu**  {#4.1.1-main-menu}

The main menu contains the following options: 

1\. Dashboard \- main screen 

2\. Communities Management 

3\. Officers Management 

4\. Calls Table \+ Incident Reports

5\. Task management (for example maintenance report)

6\. Shift Management and routes

7\. Post Orders

8\. POI & Trespass

9\. Incident Report Template management (question \- is this a manger activity or super admin)

#### **4.1.2 Change Password**  {#4.1.2-change-password}

During the first login, the user must change his initial password. The password should contain at least 8 characters, letters and numbers. The user must type it twice. 

### **4.2 Communities / Customers Management**  {#4.2-communities-/-customers-management}

In this section, the manager will be able to create a new community, edit existing one or inactive it. 

In the case of a private client, the manager will be able to initiate a new customer, just like a community (with multiple users).

#### **4.2.1 Communities/Customers List**  {#4.2.1-communities/customers-list}

This is a list of all communities/customers. Above the table there is a total number of communities in the list. 

The details are: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Community Name (or Customer name) | text |  |
| Area  | text  | an address of a specific neighborhood which defines this community’s  boundaries. |
| Active  | yes/no |  |
| Posts | Array text \+ link | List of the posts in this community (for example: main gate) The link will direct the user to the post details |
| Officers  | button  | List of officers associated with this community, detailed later |
| Residents | button  | List of resident/client belongs to this  community, detailed later |
| Calls  | button  | List of all received calls in this  community, detailed later |
| Featured Officer  | button  | Managing a banner displayed in the residents/clients app, under the officers information screen. Detailed in 4.2.5. |

- The list will be automatically filtered by active communities only, the user will be able to change this selection and see all the communities.  
- The list will be ordered by the community name, alphabetic order.  
- Search: the user will be able to search a community by name.

##### 4.2.1.1 Add New Community  {#4.2.1.1-add-new-community}

Above the table there is an Add button which opens the Add New Community window. The parameters are: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | ----- | ----- | :---- |
| Community Name  | text  | yes |  |
| Area  | text  | yes  | an address of a specific neighborhood which defines this community’s boundaries.  Options: use google places API or polygon service.  |
| Officers  | button  | no  | Opens a list of officer names defined in the system to choose one or more from, in order to associate them to this community. |
| Residents/clients  | button  | no  | Opens a window to add new residents/clients as described in 4.2.3. |
| 2D Map | Map \+ elements | no | Includes the community / property map and relevant assets / post additional info. Enables uploading a map Specify boundaries  Indicate doors/windows/ etc See 4.2.6 |
| Posts | Array text | no | List of the posts in this community (for example: main gate) The link will direct the user to the post details |

A community is added in Active state and today is the registration date. 

##### 4.2.1.2 Edit Community  {#4.2.1.2-edit-community}

Clicking on the edit button next to a community is the table, opens the community details window and enables the manager to edit details: 

| Parameter Name  | Type  | Editable  | Comments |
| ----- | ----- | :---- | :---- |
| Community Name  | text  | yes |  |
| Area  | text  | yes  | an address of a specific neighborhood which defines this community’s boundaries. |
| Officers  | list  | yes  | leads to 4.2.2 screen. The manager is able to remove one or more. |
| Add Officers  | button  | yes  | Opens a list of officer names defined in the system which are not already associated with a community, to choose one or more from, in order to associate them to this community. |
| Residents/clients  | list  | yes  | leads to 4.2.3 screen. The manager is able to remove one or more. |
| Residents/clients  | button  | yes  | Opens a window to add new residents/clients as described in 4.2.3. |
| Calls  | button  | no  | leads to 4.2.4 screen. |
| Registration Date  | date  | no |  |
| Posts | Array text \+ link | no | List of the posts in this community (for example: main gate) The link will direct the user to the post details. Edit options: add/remove post from community. Edit the post itself will be available in the post details page /change name/change location |
| Active  | yes/no  | yes |  |
| 2D map | map | yes | Opens a window which enables editing the assets, posts and additional info, see chapter 4.2.6 |

##### 4.2.1.3 Delete Community  {#4.2.1.3-delete-community}

Communities with no officers/residents/clients/calls associated can be deleted. Otherwise, it can only turn inactive. 

##### 4.2.1.4 Sort / Filter  {#4.2.1.4-sort-/-filter}

The communities list is by default sorted by ABC of their name. It can also be sorted according to each column in the table by clicking on its header. 

The list can be filtered by: 

1\. Active/Inactive. 

There will be an option to search a resident/client / officer with free text – the search is by resident/client name, officer name, community name. 

#### **4.2.2 Officers list (per community)**  {#4.2.2-officers-list-(per-community)}

Leads to the same table as in 4.3, filtered to this community. 

#### **4.2.3 Residents/customers list (per community)**  {#4.2.3-residents/customers-list-(per-community)}

Clicking on the residents/clients button per community (from the communities table or from a community details screen), leads to this screen which contains a table of all residents/clients belonging to this community. The list is sorted by ABC of the resident/client’s first name. 

Above the list there is a total number of residents/clients in the table. The table’s columns are: 

| Parameter Name  | Type  | Explanation |
| :---- | ----- | :---- |
| Full Name  | text |  |
| Mobile number  | phone  | It is used by the officer to enter his app. |
| email  | email |  |
| Address  | text |  |
| Registration date  | date  | the date this resident/client has been added to the system. |
| Active  | yes/no |  |
| Communication Test  | yes/no  | enabled or disabled. |
| Vehicle numbers | text | Enable multiple license plates |

##### 4.2.3.1 Add New resident/client  {#4.2.3.1-add-new-resident/client}

Above the table there is an Add button which opens the Add New resident/client window. The parameters are: 

| Parameter Name  | Type  | Mandatory  | Comments |
| :---- | ----- | ----- | :---- |
| Full Name  | text  | yes |  |
| Mobile number  | phone  | yes  | it is used by the resident/client to enter his app. |
| email  | email  | yes |  |
| Address  | text  | yes |  |
| Communication Test  | yes/no  | no  | By default it is no. |
| Vehicle numbers | Text | no | Enable multiple license plates |

The resident/client is added in Active state and today is the registration date. The new resident/client automatically belongs to this community. A resident/client can be associated with one community in the system. 

##### 4.2.3.2 Edit a resident/client  {#4.2.3.2-edit-a-resident/client}

Clicking on the edit button next to an resident/client in the table, opens the resident/client’s details window and enables the admin to edit details: 

| Parameter Name  | Type  | Editable  | Comments |
| ----- | ----- | :---- | :---- |
| Full Name  | text  | yes |  |
| Mobile number  | phone  | yes  | it is used by the officer to enter his app, therefore if it is changed, the officer must be identified again before login to his app. |
| email  | email  | yes |  |
| Address  | text  | yes |  |
| Vehicle numbers | Text | no | Enable multiple license plates |
| Communication  Test | yes/no  | yes  | By default it is no. |
| Registration date  | date  | no |  |
| Active  | yes/no  | yes |  |

##### 4.2.3.3 Delete a resident/client  {#4.2.3.3-delete-a-resident/client}

The resident/client can be deleted only if he hasn't logged in to the app yet. Otherwise he can only turn to inactive. 

##### 4.2.3.4 Sort / Filter  {#4.2.3.4-sort-/-filter}

The admin can sort the table according to each data column by clicking on its header. 

The admin can filter the table according to the following options: 1\. Active/inactive 

In addition there is also an option for free search in all the table’s columns. 

##### 4.2.3.5 Communication Test (with resident/client)  {#4.2.3.5-communication-test-(with-resident/client)}

The admin is able to test the communication with the resident/client in order to make sure the process works properly. By default, this option is not enabled. If the admin changes this parameter to Yes, the option in the resident/client’s app is enabled. The resident/client can send an emergency test call, which is received by the admin only (not sent to the officers) in the Calls Table as a test call. Detailed in 4.4. 

#### **4.2.4 Calls list (per community)**  {#4.2.4-calls-list-(per-community)}

Leads to the same table as in 4.4, filtered to this community. 

#### **4.2.5 Featured Officer**  {#4.2.5-featured-officer}

In this section the manager can manage the banner displayed in the community resident/clients app, under the Officer Information screen. It doesn’t have to be regarding a specific officer. 

The screen contains the current banner details (or empty), which can be edited or deleted. If the banner is deleted or still empty, the app displays a default banner design. 

The banner’s details are: 

| Parameter Name  | Type  | Explanation |
| :---- | ----- | :---- |
| Image  | image  | The banner feature picture. |
| Description  | Text  | Free text (no special text formatting) to display under the image. |

All parameters are mandatory. 

#### **4.2.6 2D Map upload and management**  {#4.2.6-2d-map-upload-and-management}

1. For each property the manager will upload the area map by clicking the “Create a map” button.  
   1. The user will specify location by marking the area boundaries (circle or square).  
   2. The system will upload the area map \- using the available API (tech decision \- NearMaps API ?)  
   3. Once the map is uploaded, this page will be opened with the map view. The user will be able to edit the boundaries of the map. 

   

* Adding entry/exit points of the community area  
* Adding High priority zones  
* Adding Assets and posts on map \- the manager can indicate the different assets and posts on site, by choosing \-   
- Add New button  
- Batch activity \- Add Multiple Assets button

A map can have up to 1,000 (?) items.

The user will be able to add either asset or a post \- the difference: assets are all kinds of items like windows, doors etc. posts are main locations, officers may be allocated to stay on a post during a shift.

##### 

##### 4.2.6.1 Adding an asset {#4.2.6.1-adding-an-asset}

When clicking on Add New, the user will  \-

1. Select a shape \- place (dot), circle, line.    
2. Click on the map and mark   
3. If needed, Undo the mark and remark again   
4. Select whether to add an asset or post.  
5. For the selected area on the map, a pop up will be opened, so the user can fill the **asset** details:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Asset ID | text | yes | auto created by the system, a unique id |
| Asset type | text | yes | TBD Assets types Door Window Camera Other |
| Installation date | date | no |  |
| Replacement Date | date | no | In case the asset should be renewed after a period of time  TBD if this is needed |
| Description | text | no | If needed, for example: manufacturer, model, serial number. |
| Location | coordinations | yes | Auto saved according to the location selected |

6. If the user closes the pop up, the information will not be saved, and the shape will be deleted.  
7. Once asset information is completed, the user clicks Save and continues adding additional assets. 

   

When Clicking on “Add Multiple Assets”, the user will  \-

1. Select a shape \- place (dot), circle, line.    
2. Click on the map and mark   
3. If needed, Undo the mark and remark again   
4. Continue clicking on the map and mark more items.  
5. Once completing marking, the user will clicks “Complete”  
6. A pop up will be opened, so the user can fill the assets details listed above.  
7. If the user closes the pop up, the information will not be saved, and the shape will be deleted \- the item will not be generated.  
8. Once asset information is completed, the user clicks Save \- The system then creates and saves the assets separately, for each asset the acres will be calculated and saved.

3\. Review/Edit/Delete assets: standing on each asset on the map will display \- asset information, edit icon, delete icon \-

- Clicking on Edit, will open a pop up with the information, the manager can then edit the details  
  - Clicking on Delete \- the system will present a message: “Are you sure you would like to delete the asset?” with Yes/Close buttons.

4\. The map should support:

- Rotate the map  
- Zoom in / Zoom out option.   
- On zoom out, the asset icons on the same area will be grouped, when the user stand on the icon, the system will present the number of assets on that area, and number of each asset types  
- Move  right/left/up/down

##### 4.2.6.2 Adding a post {#4.2.6.2-adding-a-post}

The process is the same as adding an asset, the post parameters are:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Post ID | text | yes | auto created by the system, a unique id |
| Post name | text | yes | Up to 60 characters. Must be unique within the community. |
| Description | text | no | Up to 200 chars |
| Priority | text | no | Urgent | Important | Normal | Low. Defaults is Normal. |
| Location | coordinations | yes | Auto saved according to the location selected |
| Equipment | Text | No | Required equipment for this post |
| Active | Toggle | Yes | Default: Active |
| Permissions |  |  | Question \- is this required? |
| Post order | document | No | If PO exist \- a link to the post order |

#### 

Each post can have a Post Order document associated with it, defining the duties, procedures, and instructions for the officer assigned to that post. See Post Orders chapter.   
To create the post order, the user should click on “**Create post order**” button

##### 4.2.6.3 Adding additional information {#4.2.6.3-adding-additional-information}

The user will be able to mark a point / select a polygon and add \-

* Entry/exit points of the community area \- add the name of the point  
* High priority zones \- add name of the zone


#### **4.2.7 Post and asset lists view** {#4.2.7-post-and-asset-lists-view}

In addition to the map, the assets and posts will be displayed also in a list view \- 2 different lists, the user will be able to toggle between assets and posts.

1. The list table include all information described in add asset/post   
2. The user will be able to open the asset/post page and edit/delete item \- note: A post can be deleted only if it has never been used in a shift. Otherwise it can only be set to Inactive.  
3. The user will be able to add a new asset/post \- will be directed to the map for choosing location  
4. The list should be sorted by alphabetic order.  
5. Free text search should be available, it will search on the name and description fields.  
6. For posts: Filter should be available by status (Active Yes/no), the default presentation is active only.  
7. For each post, the user can view its post order by clicking the link to the PO, and if it has the right: Edit post order.

### **4.3 Officers Table**  {#4.3-officers-table}

This is a general officers table in which the manager can have a general view of the officers working in the system. 

#### **4.3.1 Officers List**  {#4.3.1-officers-list}

The list is sorted by ABC of the officer’s first name. 

Above the list there is a total number of officers in the table. The table’s columns are: 

| Parameter Name  | Type  | Explanation |
| :---- | ----- | :---- |
| Officer’s Full Name  | text |  |
| Community name  | text  | one of the existing in the system. |
| Mobile number  | phone  | It is used by the officer to enter his app. |
| email  | email |  |
| Address  | text |  |
| Title  | text |  |
| Picture  | image  | the officer’s photo |
| Description  | text  | long text regarding this officer. |
| Registration date  | date  | the date this officer has been added to the system. |
| Role | Array text | Multiple roles |
| Certification badges  | text |  |
| Active  | yes/no |  |

#### **4.3.2 Add New Officer**  {#4.3.2-add-new-officer}

Above the table there is an Add button which opens the Add New Officer window. The parameters are: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | ----- | ----- | :---- |
| Officer’s Full  Name | text  | yes |  |
| Community name  | text  | yes |  |
| Mobile number  | phone  | yes  | It is used by the officer to enter his app. |
| email  | email  | no |  |
| Address  | text  | no |  |
| Title  | text  | yes |  |
| Image  | photo  | no |  |
| Description  | text  | no |  |
| Role | Array text | no | From a predefined list Multiple selection should be available |
| Certification badges  | Array text | no |  |
| Officer evaluation | Array Text \+ date+ user name | no | This field is empty when initiating a new officer This field is visible only for the manager/admin (not to the officer) |

An officer is added in Active state and today is the registration date. The new officer is automatically associated with this community. 

An officer should be associated with one community in the system. 

#### **4.3.3 Edit an Officer**  {#4.3.3-edit-an-officer}

Clicking on the edit button next to an officer in the table, opens the officer details window and enables the admin to edit details: 

| Parameter Name  | Type  | Editable  | Comments |
| ----- | ----- | ----- | :---- |
| Officer’s Full  Name | text  | yes |  |
| Community name  | text  | yes  | If the community is changed, the officer will no longer receive calls from the previous community but from the new one only. |
| Mobile number  | phone  | yes  | it is used by the officer to enter his app, therefore if it is changed, the officer must be identified again before login to his app. |
| email  | email  | yes |  |
| Address  | text  | yes |  |
| Title  | text  | yes |  |
| Image  | photo  | yes |  |
| Description  | text  | yes |  |
| Registration date  | date  | no |  |
| Role | Array text | no | Officer roles selected from a predefined list |
| Certification badges  | Array text | no |  |
| Officer evaluation | Array Text \+ date \+ user name | no | This field is visible only for the manager/admin (not to the officer) |
| Active  | yes/no  | yes |  |

Officer  evaluation \-  
A manager can add the officer evaluations. Each evaluation will iclude:

- Text   
- Date  
- Evaluator name

#### **4.3.4 Delete an Officer**  {#4.3.4-delete-an-officer}

The officer can be deleted only if he hasn't logged in to the app yet. Otherwise he can only turn to inactive. 

#### **4.3.5 Sort / Filter**  {#4.3.5-sort-/-filter}

The manager can sort the table according to each data column by clicking on its header. 

The manager can filter the table according to the following options: 

1\. Community name 

2\. Active/inactive 

In addition there is also an option for free search in all the table’s columns. 

### **4.4 Calls Table, Live Panic button call and Incident Reports** {#4.4-calls-table,-live-panic-button-call-and-incident-reports}

This is the call center, where the manager can have a general view of all open calls in the system and Incident reports. 

The page is separated to “Calls Table” and “Incidents reports” (accordion), by default the calls page is displayed.

The page default shows calls from all communities but it can be filtered to a certain community. 

The screen contains 2 tabs: Open calls and History. 

#### **4.4.1 Open Calls List**  {#4.4.1-open-calls-list}

The list contains mostly service calls which are sorted by scheduled date and time, from closest to farthest (in the future). Each call in the list contains the following details: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Call Category | icon  | “medical emergency”, “security  Emergency”, “Concierge service”, ““test emergency” |
| Service Type \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. as well as  |
| Resident/client’s Name  | text |  |
| Community’s Name  | text  | The community this resident/client belongs to. |

| Address  | text  | The resident/client’s home address |
| ----- | :---- | :---- |
| Scheduled date and time  | date and  time | The time the user set when he opened the call or the time the manager set when he associated it with this officer. Or the time the officer clicked on “on the way” for emergencies.  It can be empty if it is not scheduled yet. |
| Officer’s name  | text  | The officer’s name associated with this call or the one who accepted the call (in case of emergency). Otherwise it is empty. |
| Status  | text  | Options: New, Accepted. |

Emergency Test calls will have only the time of creation. 

#### **4.4.2 Open Call Details**  {#4.4.2-open-call-details}

Clicking on a call in the list leads to the call details screen with the following details: 

| Parameter Name  | Type  | Comments |
| ----- | ----- | :---- |
| Call Category | icon  | “medical emergency”, “security  Emergency”, “Concierge service”, ““test emergency”. |
| Service Type \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. |
| Call Date and Time  | Date and  Time | of opening the call by the user. |
| resident/client’s Name  | text |  |
| Community’s Name  | text  | The community this resident/client belongs to. |
| Address  | text  | The resident/client’s home address |
| Current address  | text  | relevant for emergencies, the resident/client’s current location |
| Description  | text  | the user comments |
| Scheduled date and time  | date and  time | The time the user set when he opened the call or the time the admin set when he associated it with this officer. Or the time the officer clicked on “on the way” for emergencies. It can be empty if it is not scheduled yet. |
| Officer’s name  | text  | The officer’s name associated with this call or the one who accepted the call (in case of emergency). Otherwise it is empty. |
| Status  | text  | Options: New, Accepted. |
| Media  | Gallery  | images the user uploaded (if any). Clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| Audio recording  | audio  | relevant to emergencies only. |
| Video  | player  | relevant to emergencies only. |
| Documents | files | *Visible only to the admin/manager/officer (not to the resident)* |
| Document transcription | Text files | *Visible only to the admin/manager/officer* |
| Officer route |  | This will be added after the the call is closed \- the route will be taken from the officer GPS information from the time the call was opened to the time it was closed *Visible only to the admin/manager/officer* To be confirmed with tech team |

Currently, the manager cannot make any changes to an open call except for associating an officer to a service call (detailed in 4.4.5) and upload files. It also cannot be deleted, unless it’s an emergency test call.   
Note: No one should be able to cancel an emergency call until it's completed. Manager can cancel any other service request

##### 4.4.2.1 Emergency Test calls  {#4.4.2.1-emergency-test-calls}

These are used in order to test the communication with a specific resident/client. It is received as an emergency call but the manager cannot do anything with it except deleting. It cannot be saved in history. The manager cannot change its status or assign it to an officer. The call is received in the manager system only, it is not sent to the officer. 

#### **4.4.3 History**  {#4.4.3-history}

This list displays all closed (and canceled) calls \- service calls and emergencies, from all communities. The list is sorted according to the date and time of scheduling (for services) or association (for emergency), from closest to farthest (in the past). 

Each call in the list contains the following details: 

| Parameter Name  | Type  | Comments |
| :---- | :---- | :---- |
| Service Type \+ icon  | Text \+ icon  | Options as listed in 2.4.2.1. as well as “medical emergency” and “security emergency” types. |
| Call Date and Time  | Date and  Time | of opening the call by the user. |

| resident/client’s Name  | text |  |
| ----- | ----- | :---- |
| Community’s Name  | text  | The community this resident/client belongs to. |
| Address  | text  | The resident/client’s home address |
| Current address  | text  | relevant for emergencies, the  resident/client’s current location |
| Description  | text  | the user comments |
| Scheduled date and time  | date and time  | The time the user set when he opened the call or the time the manager set when he associated it with this  officer. Or the time the officer clicked on “on the way” for  emergencies. It can be empty if it is not scheduled yet. |
| Officer’s name  | text  | The officer’s name associated with this call or the one who accepted the call (in case of emergency). Otherwise it is empty. |
| Status  | text  | Options: Done, Canceled. |
| Media  | Gallery  | images the user uploaded (if any). clicking on a photo opens to full view and in case there is more than 1, the user can browse them. |
| Audio recording  | audio  | relevant to emergencies only. |
| Video  | player  | relevant to emergencies only. |
| Confirmation images  | Images/video file | The officer can upload images (up to 5\) or up to 1 minute video for  confirmation purposes. It is displayed in this part. |
| Officer’s comments  | Text  | The officer can add free text  regarding the case. |
| Like Reaction  | icon  | if the resident/client clicked on the Like button. |
| resident/client’s comments  | text  | comments the resident/client may have added when the call is closed. |
| Documents | files | *Visible only to the admin/manager/officer (not to the resident)* |
| Document transcription | Text files | *Visible only to the admin/manager/officer* |
| Officer route |  | This will be added after the the call is closed \- the route will be taken from the officer GPS information from the time the call was opened to the time it was closed *Visible only to the admin/manager/officer* To be confirmed with tech team |

The activities allowed on calls in the History \- 

1. Uploading documents and auto transcription.  
2. Share incident \-  
   1. Share to email \- the email will include a link to the incident (only users will be able to access the call details), location, description, comments, pictures uploaded. (To be confirmed by the tech team)  
   2. Export incident \- create an excel with the following details: type, description, location, comments, images.

#### **4.4.4 Filters**  {#4.4.4-filters}

Each one of the tables can be sorted according to each data column by clicking on its header. 

The manager can filter the table according to the following options (AND relation): 

1\. Community 

2\. Service type (including emergencies) 

3\. resident/client’s name 

4\. Officer’s name 

5\. Status 

6\. Scheduled Time range 

7\. Open time range 

In addition there is also an option for free search in all the table’s columns. 

#### **4.4.5 Assign call to an officer**  {#4.4.5-assign-call-to-an-officer}

Service calls with status New should be associated with an officer by the manager. There is a button in the officer’s name parameter which enables the manager to assign the call. Clicking on this button opens a popup with the following details: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | ----- | ----- | ----- |
| Officer’s Name  | button  | yes  | Opens a list of all the officers belonging to the resident/client’s community to choose one from. After choosing, the officer’s name is displayed next to the button. |
| Schedule date  | Date  | yes  | Open a calendar to choose a date from. |
| Schedule time  | time  | yes  | Choosing an exact time or time range. |

After saving, the details are updated in the resident/client’s app and relevant officer’s app, as well as receiving a push notification.   
Do we want to enable the manager to make any changes in the assignment? 

#### **4.4.6 Panic button calls** {#4.4.6-panic-button-calls}

Once a resident/client/officer is pressing on the panic button \- a push notification is sent to the operator manager.  
The notification will pop up on the screen , covering all other activities.

The message will include the immediate details-

- User name  
- User location when pressing the button  
- User current location

The operator will be able to

* Assign to an officer (the officer will accept the call. Similar to handling an emergency call)  
* Correspond with the user that sent the call (the system will activate two-way communication)  
* View user live location  
* Close the call \- once he gets a confirmation from the officer \- the call status will be changed to “Resolved”

The panic call parameters: 

| Parameter Name  | Type  | Mandatory | Comments |
| :---- | ----- | :---- | :---- |
| Call type | text  | Yes | Automatically populated by the system as Panic call |
| User Name  | Text / link | Yes | Automatically populated  |
| Call Date and Time  | Date and Time  | Yes | Automatically populated, the time when the panic button was pressed. |
| Location  | text  | Yes | The user current location |
| Live location | Date & Time | No | The user current location |
| Communication | Text | No | Every comment will be captured with user came & date/time |
| Status | Text | Yes | Active/Close |

#### **4.4.7 Incident Reports** {#4.4.7-incident-reports}

The incident reports page shows all submitted reports at communities the manager oversees.

The list will be filtered by default by all reports with “review before client” indication in status Submitted, the manager can select to view All reports

The list include the following parameters \-

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Report ID | Text |  |
| Report Title | Text |  |
| Template | Text | Template name used |
| Community | Text |  |
| Officer | Text | Officer who submitted the report. |
| Submitted At | Date/Time | When the officer submitted. |
| Report Status | Text | Submitted Under Review Changes Requested Approved Delivered. |
| Source Call | Link | Call ID if incident-linked.  Empty for standalone reports. |
| Review Required | Badge | Yes / No based on template settings |

Filters above the list:

* Community (multi-select)  
* Status (multi-select)  
* Report Category: Incident / Daily Activity / Custom  
* Date range (submitted date)  
* Review Required: Yes / No  
* Free-text search across report title, Report ID, Officer

The manager can choose a report and view its details.

##### 4.4.7.1  Opening a Report Details for Review {#4.4.7.1-opening-a-report-details-for-review}

Clicking on a Submitted report opens the Report Review screen. 

The screen displays \-

* The full report content as submitted by the officer  
* Action button \- approve, deliver, request for changes  
* History view

Note: Only one manager can hold a report Under Review at a time. 

When a manager opens a Submitted report, its status changes to Under Review and it is locked for other managers. If the reviewing manager closes the report without taking action, the status reverts to Submitted

##### 4.4.7.2  Editing a Report Details {#4.4.7.2-editing-a-report-details}

The manager can edit the report content during review. Edits are tracked: the original officer-submitted text is retained and the manager’s changes are visible in audit trail mode. Editable elements include:

* Text fields in any section.  
* Adding or removing photos/documents from sections.  
* Adding a ‘Manager’s Notes’ block to any section.   
* Toggling individual section inclusion for the client-facing version

The manager cannot change auto-populated fields (date/time, officer name, GPS, Report ID).

4.4.7.3 Approving a report

When the manager is satisfied with the report, he clicks ‘Approve’. This opens the Section & Delivery panel:

* Section Inclusion Checklist – every section of the report is listed with a checkbox. Sections marked Client-Visible in the template are pre-checked. The manager can check or uncheck any section for this specific report.  
* Management Summary (optional) – a text field where the manager can add a summary paragraph to appear at the beginning of the client-facing report. Up to 1,000 chars.  
* Save \- once approving and save \-  
  * Report Status change to “Approved”  
  * The officer who created the report gets a notification \- report was approved.

4.4.7.4 Deliver a report

The manager can click on “Deliver” in order to send the request to the client, the system will \-

* Change the report status to “Delivered”.  
* Generate the formatted report (using the template’s style setting) and deliver immediately upon confirmation to the client. (By email? Only notification?)  
* The report is available for the client via the mobile app.  
* Logs the delivery with timestamp and manager name in the audit trail.  
* The report cannot be edited.   
* Send push notification to the officer who created the report \- report was approved and sent to the client.

4.4.7.4 Decline a report \- request changes

If the report needs corrections, the manager clicks ‘Request Changes’ and enters comments (mandatory, up to 1,000 chars) specifying what needs to be corrected. 

The system will \-

* Change the report status to “Changes Requested”.  
* Send push notification to the officer who created the report \- report needs changes, with the comments  
* The manager’s comments are visible at the top of the report form in the officer app.

### **4.5 Dashboard**  {#4.5-dashboard}

The main screen is a dashboard which gives a general overview on the system and users behavior. 

The homepage dashboard includes \-

* Active calls   
* Open Tasks \- filtered by tasks assigned to me, with toggle all/my  
* Incident Reports  
* Overall info: numbers of active calls, number of open tasks, additional info (will be completed after full functionality description)  
* Live Tracking

#### **4.5.1 Active Calls section**  {#4.5.1-active-calls-section}

This section will show the user with \-

* Number of open calls  
* 5 recent open issues (status: New, Accepted) \- if needed with a scroll bar. sorted by creation date  
* Each issue on the list includes: Type, Description, creation date  
* “select” button next to each call item \- clicking on this button will direct the user to the call page, with this specific issue opened.  
* “Show all” button \- clicking on this button will direct the user to the **calls dashboard page**.  
* A button for Totals \- will show a pop up with a graph of totals:  
  * Selection \- status  
  * Show numbers of calls for each call type 

The calls dashboard includes 2 parts: statistics and calls list \-

##### 4.5.1.1 Statistics  {#4.5.1.1-statistics}

The first part of the screen contains several statistics. By default, the data is displayed for all communities together for the last 30 days. It can be changed as detailed later. The statistics are: 

| Statistic name  | Explanation |
| :---- | ----- |
| Response times on  emergencies | The average time it takes since a user sends an emergency call until the officer clicks on “on the way”. |
| Number of Emergency Calls | Total number of emergency calls from each type (security and medical). |
| Handling time to  service calls | The average time it takes since a user sends a service call until the officer clicks on “Done”. Also, the average time it takes since the manager assigned the service call to an officer until the officer clicks on “Done” |
| False emergencies  | Total number of emergencies which were canceled. |
| Accidental Requests  | Total number of service calls which were canceled. |

###### 4.5.1.1.1 Filters  {#4.5.1.1.1-filters}

The statistics can be filtered according to the following options: 

1\. Community 

2\. Time range 

#### 4.5.1.2 Calls list  {#4.5.1.2-calls-list}

The second part of the screen contains an alerts table with the following notifications: 

| Notification name  | When |
| :---- | :---- |
| New Emergency call  | When the user creates a new emergency call. |
| New service call  | When the user creates a service call. |
| Call Accepted  | for emergencies only, when the officer clicks on the “on the way” button. |
| Canceled call  | When the user canceled the call (emergency or service). |
| Dislike reaction  | When the user clicks on the thumb down button in the app. |

All notifications lead to the Calls Details screen. 

#### 4.5.1.3 Advanced statistics  {#4.5.1.3-advanced-statistics}

Clicking on the “Advanced statistics” button \- will direct the user to: Calls Pattern & Trend Analysis page.   
Capabilities should be finalized with the tech team \- 

- Analytics identifying recurring issues  
- Hotspots  
- Escalation patterns  
- Emerging risks across properties.

#### **4.5.2 Tasks section**  {#4.5.2-tasks-section}

This section will show the user with \-

* Number of open tasks  
* Filtered tasks that are assigned to me \- with toggle all/my  
* 5 recent open tasks (status: New, Accepted) \- if needed with a scroll bar. sorted by priority  
* Each task on the list includes: Title, Description, creation date  
* “select” button next to each task item \- clicking on this button will direct the user to the tasks page, with this specific task opened.  
* “Show all” button \- clicking on this button will direct the user to the **tasks page**.  
* A button for Totals \- will show a pop up with a graph of totals:  
  * Selection \- status  
  * Show numbers of tasks for each task type 

#### **4.5.3 Overall information** {#4.5.3-overall-information}

To be completed after finalizing functionality

#### **4.5.4 Live Tracking section** {#4.5.4-live-tracking-section}

The “Live Tracking” button will open a map page that includes:

- Employee name selection \- the manager will be able to select a specific user, including multiple selections. Default: all  
- Filter: Officers, On duty, Calls, Assets  
- Map view of the property with Real-time GPS tracking of officers, patrols, assets, and emergency calls visible to the manager/operator:  
  - Each element will have different color indication (Officers/calls/assets)  
  - The map will be refreshed every X seconds (to be decided according to tech team recommendation)  
- The user will be able to click on “More” and see the detailed Live Tracking, see chapter 4.9

#### **4.5.5 Incident reports section** {#4.5.5-incident-reports-section}

The “Incident reports” section present \-

* Number of open reports (submitted, under review, changes requested)  
* Number of total reports in the last 2 weeks  
* Filtered reports that are assigned to me \- with toggle all/my  
* 5 recent open reports, with an option to change to all statuses  
* Each report on the list includes: Title, Officer, creation date  
* “select” button next to each report item \- clicking on this button will direct the user to the report page, with this specific report opened.  
* “Show all” button \- clicking on this button will direct the user to the **reports page**.

### **4.6 Tasks management**  {#4.6-tasks-management}

The task management area presents all the tasks generated in the system, by the officers using the app or other users using the web portal. The manager can review the task, handle tasks, assign to other users or close it.

#### **4.6.1 Task management view** {#4.6.1-task-management-view}

When the manager opens this page he will see all available tasks, the page includes:

* Tasks list  
* Add New button


The initial task list includes only Open tasks (status: New, Accepted, Assigned),   
The manager can either see all tasks generated by all users, or filter the list in order to see only tasks that are assigned to him or generated by him.

Each task on the list includes the following fields:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Task ID | text | yes | auto created A unique identifier |
| task type | dropdown list | yes | choose from a list \- TBD what are the types. Do we have other types than general maintenance reports and supply requests?  Examples \- Maintenance Inspection required Damaged equipments Operational report Supply Request |
| Description | text | yes | up to 200 chard |
| Priority | dropdown | yes \- default: low | Urgent Important Normal Low |
| Date and Time | date \+ hour | yes | Populated automatically  The date of opening the task Not editable |
| Created by | text | no | The user name that opened the task |
| Status | dropdown | yes | auto populated on creation \- “New” Options: New, Accepted, Approved (if needed), Rejected, Completed, Canceled. |
| Assigned to | username | yes |  |

#### 

The page can be filtered by: 

* Task types  
* Tasks status: Open / Closed  
* Task creation dates: date range picker  
* Assign to me / all  
* Priority

The list should be sorted by creation date, the most recent tasks are on top, the user can change the order to be the opposite.

Free text search should be available, it will search on the title, description and user fields.

Each task item will be followed by the quick actions: 

* View → direct the user to the task window  
* Accept → the task should be assigned to a user  
* Reject → the rejection reason should be added in the answer field  
* Completed → the resolution should be added in the commets as well as images if needed

  In all those actions, the status of the task should be updated, push notification should be sent. See details in “3.6.4 handling a task

  #### **4.6.4 Creating a new task**  {#4.6.4-creating-a-new-task}

The manager will be able to create a new Action Item, assigned it to himself / other users.

The user will required to populate the following:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Task ID | text | yes | auto created A unique identifier |
| task type | dropdown list | yes | choose from a list  |
| Description | text | yes | up to 200 chard |
| Media | Upload button | no | Open the camera to take a picture or the mobile gallery to choose photos. Up to 5 images in total.  |
| Video | Upload button | no | Open the camera to create a video or the mobile gallery to choose a video. Only 1 video up to 1 minute (larger files will be cut).  |
| Priority | dropdown | yes \- default: low | Urgent Important Normal Low |
| Date and Time | date \+ hour | yes | Populated automatically  The date of opening the task Not editable |
| Created by | text | yes | the user that opened the task |
| Address | text | no |  |
| Status | dropdown | yes | auto populated on creation \- “New” Options: New, Accepted, Approved, Completed, Rejected, Canceled. |
| Assigned to | username | yes |  |
| ETA | time | no | Scheduled for The ETA will be added manually by the manager |
| Last update date | date \+ hour | yes | Populated automatically  when a task is updated  Not editable |
| Confirmation images | Images/video file | no | After resolving the issue \- the assignee / vendor can upload images (up to 5\) or up to 1 minute video for confirmation purposes. It is displayed in this part. |
| Assignee’s comments | array | no | Comments field should contain multiple comments, therefore every comment should include \- Text Date Commenter name |
| Documents | files | no |  |

In case there are no confirmation images and Assignee’s comments \- those fields should be hidden.

When creating a new task \-

* The manager can assign the task to himself, or select a user.   
  * User should be selected from a list, the list will have the option to search, and filter by user type  
  * The status of the Task is New, until the user clicks on accept \- the status is changed to Accepted and the assignee field will be updated with the username that accepted the task  
  * In case push notification is active \- the assignee and the user that  opened the task will get a notification about the AI

  ####  **4.6.3 Handling a task**  {#4.6.3-handling-a-task}

The users can select a task from a list and review the task’s details. 

The page includes:

* Task information  
* Status change button

The manager can then \-

* Accept the task \-   
  * The task status is changed to Accepted  
  * The assignee field will be updated with the username that accepted the task  
  * In case the report should be approved by logistics/finance/planning, the task should be assigned to the relevant user.  
  * When selecting a user \- enable autocomplete option for the user name field.  
* In case the task needs an approval, the user can change the status to “approved” and assign it back to the relevant user  
* Complete the task \-   
  * The user can add a comment, and resolution image if needed  
  * The task status is changed to Completed. The task is closed.  
* Reject the task \-  
  * Add comment \- rejection reason  
  * The task status is changed to Rejected. The task is closed.

After performing the activities above and save the information \-

* The task “last update date” is updated  
* In case push notification is active \- the assignee and the user that opened the task will get a notification about the task.

##### 4.6.3.1 Closing the task  {#4.6.3.1-closing-the-task}

The task is closed when 1 of 3 things happen: 

1\. The one that opened the task canceled his task 

2\. The assignee updated the task status as Completed.

3. The assignee updated the task  status as Rejected.

When the officer is done, he can upload images/short video / documents to confirm he completed the task (as detailed above). 

### **4.7 Shift Management & Officer Allocation** {#4.8.2-route-output}

## 

The shift management module enables operations managers to:

* Define shifts (date, time range, site/community) and publish them to officers.  
* Allocate one or more officers to a shift and to specific posts within a site.  
* View a consolidated schedule across all communities.  
* Receive AI-generated patrol route recommendations and push them to officers.  
* Monitor real-time officer locations and shift status from the Dashboard.

#### **4.7.1  Shift Calendar View (Manager Portal)** {#4.8.2-route-output}

The Shift Calendar is accessible from the main menu under 'Shift Management'. It provides a visual overview of all scheduled shifts.

##### 4.7.1.1  Calendar Display {#4.8.2-route-output}

The calendar supports three views selectable by the user:

* Day view \- displays all shifts for a single selected day, one column per officer.  
* Week view (default) \- displays the current ISO week; each column represents a day.  
* Month view \- compact display; each cell shows the count of shifts per day.

Each shift block in the calendar displays:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Officers Name | Text array | Full name of the allocated officers  |
| Community / Site (client) | Text | The community or site this shift belongs to. |
| Shift Start Time | Time | Displayed in the community local timezone. |
| Shift End Time | Time | Displayed in the community local timezone. |
| Status | Badge / icon | The options are: Draft Published Active Completed Cancelled |
| Post | Text |  |

## 

Note: Clicking on a shift block opens the Shift Details panel.

##### 4.7.1.2  Filters & Search {#4.8.2-route-output}

Above the calendar there is a filter bar. The manager can filter by:

* Community / Site  
* Officer name (free-text autocomplete)  
* Shift status (multi-select)  
* Date range (overrides the current view range)

#### **4.7.2  Shift Details** {#4.8.2-route-output}

Clicking on a shift block (or the 'Add Shift' button) opens a slide-over panel on the right side of the screen. The panel contains all editable shift parameters.

 Shift details \-

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Shift ID | Text | Yes | Unique identifier, auto-generated by the system. |
| Community / Site | Dropdown | Yes | Select from the list of active communities. |
| Shift Date | Date | Yes | The calendar date on which the shift falls. |
| Start Time | Time | Yes | 24-hour format. Must be before End Time. |
| End Time | Time | Yes | 24-hour format. Overnight shifts are supported (e.g. 22:00-06:00 next day). |
| Recurring | Toggle | No | If enabled, the shift repeats according to the recurrence rule. |
| Officers | Multi-select | Yes | Select one or more officers from the community officers. |
| Post Assignment | Table | No | For each allocated officer, the manager can assign one or more named posts. A Post Order document can be linked to each post |
| Patrol Route | Button / link | No | Opens the patrol route panel  Available after the community map is uploaded. |
| Notes | Text | No | Free text up to 500 characters; will be visible to allocated officers. |
| Status | Auto | Yes | Default \- Draft  Changed to Published when the manager clicks Publish. |

## 

##### 4.7.2.1  Recurring Shifts {#4.8.2-route-output}

When the Recurring toggle is enabled, the following additional fields appear:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Recurrence Pattern | Dropdown | Yes | Options: Daily Specific days of the week Every X days. |
| Repeat On | Multi-select (days) | Conditional | Shown when pattern \= Specific days. E.g. Mon, Wed, Fri. |
| End Condition | Radio | Yes | Options: End Date Number of Occurrences No End |
| End Date | Date | Conditional | Shown when End Condition \= End Date. |
| Occurrences | Number | Conditional | Shown when End Condition \= Number of Occurrences. Max 365\. |

## 

Note: *Editing a recurring shift will prompt the manager to choose whether the change applies to: This shift only / This and future shifts / All shifts in the series.*

##### 4.7.2.2  Shift Status Lifecycle {#4.8.2-route-output}

| Status Name | Change Trigger | Action |
| :---- | :---- | :---- |
| Draft | Shift is created but not yet sent to officers. | Visible to managers only. Officers do not receive a notification. |
| Published | The manager clicks the Publish button. | A push notification is sent to all allocated officers. The shift appears in the officer's app. |
| Active | The shift Start Time is reached and at least one allocated officer has checked in. | Shift appears as Active in the Dashboard Live view. GPS tracking becomes mandatory. |
| Completed | The shift End Time has passed and all allocated officers have checked out. | The shift is moved to history. A shift summary is generated automatically. |
| Cancelled | Manager cancels the shift before it becomes Active. | A push notification is sent to all allocated officers. The shift is removed from officer apps. |

#### 

#### **4.7.3  Officer Allocation** {#4.8.2-route-output}

Officer allocation is the process of assigning available officers to a specific shift and post. It can be done from the Shift Details panel or from a dedicated Allocation Board.

##### 4.7.3.1  Allocation Board {#4.8.2-route-output}

The Allocation Board is a drag-and-drop interface accessible from the Shift Calendar toolbar. It presents:

* Left panel \- list of all available officers for the selected date and community, showing their current weekly hour total and roles.  
* Right panel \- the shift timeline for the selected date, with one row per shift block.

The manager can drag an officer from the left panel onto a shift block to allocate them. Dropping an officer onto an already-allocated shift block opens the Post Assignment modal.

##### 4.7.3.2 Allocation Conflicts {#4.8.2-route-output}

The system validates allocations and displays inline warnings for:

* Double-booking: the same officer allocated to two overlapping shifts.  
* Assumption: allocation is based on the roles/certification, the system does not validate  matching roles to a shift.  
* Overtime: the allocation would cause the officer to exceed the configured maximum weekly hours.  
* Consecutive shift gap: the officer's rest period between shifts falls below the configured minimum (default: 8 hours).

Warnings do not block saving, but require the manager to explicitly acknowledge them by ticking a confirmation checkbox before publishing.

Question \- Should the system hard-block double-booking, or only warn? To be decided with the operations team.

#### **4.7.4  Push Messages \- Shift Management** {#4.7.4-push-messages---shift-management}

The following push notifications are generated by the Shift Management module. 

| Push Message Name | When | Who Receives It |
| :---- | :---- | :---- |
| Shift Published | Manager publishes a shift. | All allocated officers receive a notification with shift date, time, and site. Links to Shift Details in the officer app. |
| Shift Updated | Manager edits a published shift (time, post, or route change). | All allocated officers receive a notification summarising what changed. |
| Shift Cancelled | Manager cancels a published shift. | All allocated officers receive a cancellation notification. |
| Route Updated | Manager pushes a new or modified patrol route mid-shift. | The active officer(s) receive an alert that their patrol route has been updated. |
| Shift Starting Soon | Configurable lead time before shift start (default: 30 minutes). | Allocated officers who have not yet checked in receive a reminder. |
| Post order updated | A manager published a new post order or update existing one | All officers allocated to the affected post The message will be sent with a link to the post |

### 

### **4.8  Patrol Route Optimisation** {#4.8.2-route-output}

The system includes an AI-driven patrol route engine that analyses site layouts, incident history, officer locations, and operational priorities to recommend optimal patrol routes for each shift. The goal is to maintain security coverage effectiveness while reducing fuel consumption, travel time, and vehicle wear.

#### **4.8.1  Route Generation** {#4.8.2-route-output}

A patrol route can be generated in two ways:

* Automatically \- when a shift is published, the system generates a recommended route for each allocated officer and attaches it to their shift. To be confirmed and finalized with tech team  
* On demand \- the manager can click the 'Generate Patrol Route' button in the Shift Details panel at any time before or during a shift.

The route engine takes the following inputs into account:

| Parameter Name | Source | Comments |
| :---- | :---- | :---- |
| Site Map & Boundaries | 2D map data | Asset positions, entry/exit points, and defined post locations (see 4.2.6). |
| Incident Hotspots | Analytics data | Areas with elevated incident frequency in the last 90 days,  |
| Officer Start Position | GPS | The officer's last known location (or their allocated post if GPS is unavailable). |
| Shift Duration | Time range | Route length is calibrated to fit within the shift window with buffer time. |
| Vehicle / Foot Patrol | Officer role | Route type and waypoint spacing are adjusted based on whether the officer is on foot or in a vehicle. |
| Existing Post Assignments | Post list | All allocated posts are incorporated as mandatory waypoints. |
| Time of Day | Timestamp | Night routes / day route  |
| Coverage Priority Zones | Map polygons | Manager-defined high-priority zones that must be visited at a defined frequency. |

## 

#### **4.8.2 Route Output** {#4.8.2-route-output}

The generated route is displayed as an ordered list of waypoints on the community map and sent to the officer's mobile app. 

Each waypoint includes:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Waypoint Number | Number | Sequential order in the route. |
| Location Name | Text | Post name or auto-generated label (e.g. 'North Perimeter \- Camera 4'). |
| Coordinates | GPS lat/lng | Used to navigate the officer on the map. |
| ETA from Previous | Duration | Estimated travel time from the previous waypoint. |
| Dwell Time | Duration | Recommended time to spend at this location. Configurable per post. |
| Priority Level | Badge | Reflects the post priority or hotspot severity. |
| Notes | Text | Any special instructions for this waypoint (from post description or manager override). |

#### 

#### **4.8.3  Route Display \- Manager Portal** {#4.8.3-route-display---manager-portal}

In the Shift Details panel, a 'View Route' button opens the community map with the route overlaid as a polyline connecting all waypoints in order. The manager can:

* Drag waypoints to adjust the route manually.  
* Add a new waypoint by clicking on the map.  
* Remove a waypoint by clicking its X icon.  
* Reorder waypoints via drag-and-drop in the waypoint list panel on the left.  
* Regenerate the route (discards manual edits and runs the AI engine again).

Save and push the modified route to the officer's app.

### **4.9  Live Tracking \- Management Portal** {#4.9.5-map-refresh-rate}

The Live Tracking view is accessible from the Dashboard (see 4.5.4) via the 'Live Tracking' button. It opens a full-screen map page.

#### **4.9.1  Map Display** {#4.9.5-map-refresh-rate}

The map is a real-time view built on the community 2D map with a live data overlay. The following elements are displayed:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Officer Markers | Coloured pin / avatar | One marker per checked-in officer.  Colour indicates status (see 4.9.2).  Tapping a marker opens the Officer Info panel (4.9.3). |
| Patrol Route Overlay | Polyline | The planned patrol route for each active officer (grey). The path already travelled is shown in the officer status colour. Shown/hidden per officer via the filter panel. |
| Waypoint Markers | Numbered pins | Planned route waypoints. Visited waypoints are shown with a green tick; unvisited are hollow. |
| Emergency Call Markers | Red pulsing pin | Location of any currently open emergency call. Tapping opens the Call Details panel. |
| Posts Markers | Icon per asset type | Fixed posts from the map Shown/hidden via the filter panel. |
| Community Boundaries | Polygon overlay | The defined service area boundary for each community. |

## 

#### **4.9.2  Officer Marker Status Colours** {#4.9.5-map-refresh-rate}

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Green | Checked in, no active call, on patrol route. | Normal operational status. |
| Blue | Checked in, responding to an emergency call. | The officer has clicked 'On the Way'. |
| Amber | Checked in but the GPS signal was lost or stale. | No location update received for more than 2 minutes. |
| Red | Checked in, a waypoint has been skipped. | Patrol compliance alert. |
| Grey | Checked out or not yet checked in. | The officer is off duty. |

## 

#### **4.9.3  Officer Info Panel** {#4.9.5-map-refresh-rate}

Clicking on an officer marker opens a slide-out info panel with the following details:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Officer Name | Text | Full name with link to officer profile. |
| Photo | Image | Officer profile photo. |
| Community / Site | Text | Active shift community. |
| Shift Time | Time range | Start and end time of the current shift. |
| Current Post | Text | The post the officer is currently assigned to (if applicable). |
| Active Call | Text / link | If the officer is handling a call, the call ID and type are shown. Link opens Call Details. |
| Next Waypoint | Text | Name and ETA to the next patrol waypoint. |
| Last GPS Update | Timestamp | Time of the most recent location update. |

#### 

#### **4.9.4  Filter & Selection Controls** {#4.9.5-map-refresh-rate}

A filter panel is available on the left side of the Live Tracking screen. Controls include:

* Community selector \- view all communities simultaneously or filter to one.  
* Officer selector \- multi-select to show only specific officers.  
* Layer toggles \- independently show/hide: Officers, Patrol Routes, Emergency Calls, Posts.  
* On Duty only toggle \- hides checked-out officers (default: On).  
* Map refresh interval \- display-only indicator showing the current auto-refresh rate.

#### **4.9.5  Map Refresh Rate** {#4.9.5-map-refresh-rate}

The Live Tracking map refreshes automatically at the interval configured in system settings (default: 30 seconds). An indicator in the map toolbar shows the time elapsed since the last refresh and a manual 'Refresh Now' button.

#### **4.9.6 Push Messages \- GPS & Tracking** {#4.9.6-push-messages---gps-&-tracking}

Question \- is this required?

| Push Message Name | When | Who Receives It |
| :---- | :---- | :---- |
| GPS Signal Lost | An officer's GPS has not updated for longer than the configured Stale Alert Threshold. | The manager/supervisor receives an alert with the officer's name and last known location. |
| GPS Restored | GPS signal is recovered after a stale period. | The manager/supervisor receives a resolution notification. |
| Officer Off-Route | An officer deviates more than a configurable distance from their planned patrol route for more than 5 minutes. | Manager/supervisor notification with officer name and map link.  |
| ETA Updated | Emergency response ETA changes by more than 2 minutes since the last update. | The resident/client app receives an updated ETA notification. |

### **4.10 Post Orders** {#4.10-post-orders}

The Post Orders module enables creation, management, versioning, and distribution of digital post orders to the Code4 users. 

Post orders are structured, versioned documents attached to a specific post within a community. The post order define the duties, procedures, and site-specific instructions that govern how officers operate at each post.

The post orders will be accessible to officers via the mobile app, to supervisors and managers via the Management Portal, and to clients via the mobile app.

#### **4.10.1 Post Orders management principles** {#4.10.1-post-orders-management-principles}

* Post Orders are authored and published exclusively by **managers and admins**.  
* Each section within a Post Order can be independently marked as **visible or hidden** for the client view. Officers and supervisors always see the full document.  
* Each Post Order can have multiple versions, every published change creates a new **version**. All previous versions are retained and viewable. (Officers are notified of updates)  
* Offline availability: Post Orders should be available to the officers also offline.   
* Audit trail: The system records who read and acknowledged each version and when. Question \- is this needed?

#### **4.10.2 Post Orders list** {#4.10.2-post-orders-list}

The manager can:

- View all existing post orders   
- Create a new one.  
- 

The list displays all Post Orders in the system, filtered by the manager’s accessible communities (one row per Post Order). 

The list is sorted by community name then post name by default.

The list displays all Post Orders in the system, filtered by the manager’s accessible communities (one row per Post Order). The list is sorted by community name then post name by default.

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Post Order ID | Text | Auto-generated ID |
| Community / Site | Text | The community the post belongs to. |
| Post Name | Text / link | The post this order covers. Link opens the post record (6.4). |
| Status | Text | Draft  Published Archived. |
| Current Version | Text |  |
| Last Published Date | Date/Time | Date and time of the most recent publish. |
| Last Published By | Text | Manager name. |
| Review Due | Date |  |
| Acknowledged (%) | Percentage | Percentage of currently allocated officers who have acknowledged the active version. TBD if this is needed |

Filter options above the list:

* Community (multi-select)  
* Status  
* Review Due: Due to date (with an option to choose today, meaning: Overdue)  
* Free-text search across Post Order ID, post name, and community name

#### **4.10.3 Create a new post order** {#4.10.3-create-a-new-post-order}

When a manager chooses to create a new post order he will be directed to the creation page.

Each Post Order includes \-

- Header  
- Sections \- PO can have one or more sections  
- is composed of a header block and an ordered list of sections. 

##### 4.10.3.1  Post Order Header {#4.10.3.1-post-order-header}

The header is auto-populated and not editable by the manager after creation. 

The manager must first select the post this post order will be attached to.

The header contains:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Post Order ID | Text | Yes | Auto-generated unique identifier.  |
| Post Name | Text | Yes | The post this post order is attached to. In case the post order is generated from the post, this field will be auto populated. Otherwise \- select from a list of posts  |
| Community / Site | Text | Yes | Inherited from the post. |
| Current Version | Text | Yes | Semantic version number:  Major.Minor (e.g. 2.1) |
| Status | Text | Yes | Status options: Draft (default on creation) Published Archived. |
| Author | Text | Yes | The manager who created the Post Order. |
| Last Published By | Text | Yes | The manager who published the most recent version. |
| Creation Date | Date | Yes | The date Post Order was first created. |
| Last Published Date | Date/Time | Yes | Date and time of the most recent publish action. |
| Effective Date | Date | Yes | The date from which the current version is considered active. Defaults to the publish date but can be set in the future. |
| Review Due Date | Date | No | Optional. If set, a reminder notification is sent to the author when this date is reached. |

##### 4.10.3.2  Post Order Section {#4.10.3.2-post-order-section}

Each section includes \-

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Section Type | Text | Yes | The types are created and managed by the admin, in the Setting area. TBD default values if needed General information Duties & Responsibilities Emergency procedures Access Control Rules Patrol Instructions Use of Force & Legal Guidance Reporting Requirements Equipment & Uniform Communication Protocols Persons of Interest Client-Specific Instructions Vendor & Contractor Rules |
| Section Title | Text | Yes | Pre-filled from the section type name but editable. Max 80 Chars |
| Description | Rich text | Yes | Up to 10,000 characters per section (formatted text) |
| Attachments | Files | No | PDF, image (JPEG/PNG), or video files (up to 1 minute).  Maximum 5 attachments per section.  File size limit: 20 MB per file.  Displayed inline in the officer and client app and client portal. |
| Client-Visible Toggle | Yes/No | Yes | Controls whether this section appears in the client-facing view.  Each section type has a default value (set by the admin), can be overridden per Post Order. |
| Notes | Text | No | Free-text notes visible only to managers and admins. Never shown to officers or clients. Up to 2,000 chars. |

The order of sections within a Post Order can be freely rearranged by the manager using drag-and-drop. The client always sees sections in the same order, with non-approved sections hidden.

After filling in details, the manager can either:

* Save as Draft – stores the Post Order without notifying anyone.  
* Publish – immediately publishes version 1.0, notifying all officers allocated to the post.

#### **4.10.4  Editing Post Order** {#4.10.4-editing-post-order}

Clicking the “Edit” button next to a Published Post Order opens the editor in Draft mode. The current Published version remains active and visible to officers and clients until the new Draft is published. 

The editor displays all sections with full content visible and editable.

The manager can edit a Post Order \- 

- Add/remove sections  
- Rearrange sections  
- Edit sections text  
- Edit Notes  
- Review due date  
- Change Effective Date


Editing a Published Post Order section details \- creates a new Draft automatically.

The existing Published version remains active until the new Draft is published. 

Only one Draft can exist at a time per Post Order.

#### **4.10.5  Post Order Lifecycle** {#4.10.5-post-order-lifecycle}

A Post Order moves through the following statuses during its lifecycle:

| Status Name | Change Trigger | Action |
| :---- | :---- | :---- |
| Draft | Post Order is created (or an edit is started on a Published version, creating a new draft). | Visible and editable by managers and admins only. Not visible to officers or clients. No notifications sent. |
| Published | Manager or admin clicks the Publish button and confirms. An Effective Date is set. | Becomes the active version for the post. Push notifications sent to allocated officers. Previous published version is moved to version history. Client portal updated. |
| Archived | Manager explicitly archives a Published Post Order, or a community/post is deactivated. | No longer shown to officers or clients as the active document. Retained in version history for audit purposes. Cannot be edited; a new Post Order must be created if needed. |

##### 4.10.5.1  Publishing a Post Order  {#4.10.5.1-publishing-a-post-order}

When the manager is ready to publish, they click the “Publish” button. A confirmation dialog appears with the following fields:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Version Type | Radio | Yes | Choose Minor/Major The system should auto generate a version number. Minor update (e.g. 1.0 → 1.1) Major update (e.g. 1.1 → 2.0) |
| Change Summary | Text | Yes | A brief description of what changed (up to 200 characters). Included in the push notification sent to officers. |
| Effective Date | Date | Yes | Defaults to today, can be edited |
| Notify Officers | Toggle | Yes | Default: Yes Options: Yes/No If Off, the Post Order is published silently (no push notification).  |

When the manage confirms the publish:

* The new version becomes the active Published version.  
* The previous Published version is moved to version history with status “Superseded”.  
* Push notifications are sent to all currently allocated officers (if Notify Officers is On).  
* The client app is updated immediately.

#### **4.10.6  Delete a Post Order**  {#4.10.6-delete-a-post-order}

A Post Order in Draft status with no published history can be permanently deleted. 

A Published or Archived Post Order cannot be deleted; it can only be Archived. 

#### **4.10.7  Post Order History View** {#4.10.7-post-order-history-view}

The Version History panel is accessible from the Post Order detail screen (manager and admin only). It displays a chronological list of all published versions:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Version | Text | Version number (e.g. 2.1) |
| Published By | Text | Manager name |
| Published At | Date & Time | Timestamp |
| Effective Date | Date | The date this version became active |
| Change Summary | Text | The summary entered at publish time |
| Version Type | Badge | Major / Minor |

Actions \-

- The manager can select a version, click on “View” button, and open the post order.

### **4.11 Persons of Interest & Trespass Intelligence** {#4.11-persons-of-interest-&-trespass-intelligence}

The Person of Interest module enables creation, management, and cross-site distribution of records for persons of interest, trespassed individuals, and Metro red cards. 

The goal is for officers to recognise and respond appropriately to individuals who pose a known or potential risk to a site. The individuals may have formal trespass orders, Metro-issued red cards, or be flagged as persons of interest based on prior incident history.

The system supports three record types: 

| Record Type | Definition | Issued By | Key Distinction |
| :---- | :---- | :---- | :---- |
| Person of Interest (POI) | An individual flagged for monitoring based on prior incidents, suspicious behaviour, or intelligence. No formal legal order required. | Code4 manager or officer (permissions are required) | Informational only.  |
| Trespass Order | A formal notice prohibiting a named individual from entering a defined property. Backed by a signed trespass notice or court order. | Manager (based on client or legal instruction) | Legal instrument. Officer may request the individual to leave and, if refused, can involve law enforcement. Carries a defined expiry date. |
| Metro Red Card | A transit authority–issued an exclusion notice prohibiting an individual from using specific metro/transit facilities or surrounding property. | Transit authority (Metro); entered into system by manager | Externally issued. Code4 officers enforce on behalf of the transit authority. Expiry and jurisdiction defined by the issuing authority. |

The record type determines the response guidance shown to officers in the app and the legal disclaimer displayed when a record is accessed. 

Permissions \-

- Add & Edit \- admin and manager only  
- View \- Supervisor and officers  
- Note: Clients do not have access to the POI registry

When the admin/manager enters this page he can \-

- View the list of all existing records  
- Add a new one by clicking the Create button.

#### **4.11.1 Create a new POI / TI / MRC** {#4.11.1-create-a-new-poi-/-ti-/-mrc}

The manager can create a new record and populate the relevant fields.

First he selects the Record Type first, which determines which additional fields are shown. Following are the fields: 

| Parameter Name | Type | Mandatory | Comments | Relevant for Record Type |
| :---- | :---- | :---- | :---- | :---- |
| Record ID | Text | Auto | Unique identifier Auto generated by the system.  | All |
| Record Type | Dropdown | Yes | Select from a dropdown: Person of Interest Trespass Order Metro Red Card | All |
| Status | Text | Yes | Options: Draft Active Expired Inactive Archived | All |
| First Name | Text | Yes | Up to 60 chars | All |
| Last Name | Text | Yes | Up to 60 chars | All |
| Known Aliases | Text | No | Comma-separated list of known alternative names or nicknames.  Up to 200 characters. | All |
| Date of Birth | Date | No |  | All |
| Gender | Dropdown | No | Options: Male Female Unknown | All |
| Physical Description | Text | No | Free text Example: height, build, hair colour, distinguishing features.  Up to 500 chars. | All |
| Photos | Images | Yes | At least 1 photo is required Maximum 10 photos, max 5 MB per image.  | All |
| Sites / Communities | Array text | Yes | Select from community list Multiple selection   | All |
| Threat Level | Dropdown | Yes | Option: Low Medium High Critical | All |
| Summary | Text | Yes | A brief description of why the individual is flagged. This will be visible to officers.  Up to 300 chars. | All |
| Internal Notes | Text | No | Extended notes visible to managers and admins only. Not shown to officers.  Up to 2,000 chars. | All |
| Related Incident IDs | Text / links | No | If exist \- Links to one or more incidents that relate to this individual. | All |
| Created By | Text | Auto | Username of the manager who created the record. | All |
| Creation Date | Date/Time | Auto | Populated automatically. | All |
| Last Updated Date | Date/Time | Auto | Populated automatically on every save. | All |
| Approved By | Text | Auto | Username of the supervisor/manager who approved the record for publishing.  | All |
| Approval Date | Date/Time | Auto | Timestamp of the approval action. | All |
| Export Files | files | No | In case a PDF was generated by the admin in order to share with authority | All |
| Incident History Summary | Text | No | Brief narrative of the incidents that led to this individual being flagged. Up to 1,000 characters. Managers only. | POI |
| Watch Level Review Date | Date | No | A date on which the record should be reviewed to determine whether it remains warranted. A reminder is sent to the creating manager. | POI |
| Associated Individuals | Text | No | Names or Record IDs of other individuals known to associate with this person. Up to 500 characters. | POI |
| Trespass Notice Number | Text | Yes | The reference number of the signed trespass notice or court order document. | Trespass Order |
| Issuing Authority | Text | Yes | The name of the individual or legal entity who issued the notice (e.g. property manager name, court name). | Trespass Order |
| Property / Area Covered | Text | Yes | Description of the specific area or property the trespass order covers. | Trespass Order |
| Issue Date | Date | Yes | The date when trespass notice was signed and legally effective. | Trespass Order |
| Expiry Date | Date | Yes | Date the trespass order expires. The system automatically transitions status to Expired on this date.  | Trespass Order |
| Notice Document | File | Yes | Upload the signed trespass notice as a PDF. Maximum file size: 20 MB.  Accessible to managers and supervisors only; (Not shown to officers in the app) | Trespass Order |
| Renewal Reminder | Number | No | Days before expiry to send a renewal reminder to the creating manager.  Default: 14 days | Trespass Order |
| Law Enforcement Contact | Text | No | Name and badge number of the law enforcement officer associated with this order, if applicable. | Trespass Order |
| Conditions | Text | No | Any specific conditions attached to the trespass order  For example: exclusion zone radius, permitted contact exceptions | Trespass Order |
| Red Card Number | Text | Yes | The unique card number issued by the transit authority. | Metro RC |
| Issuing Authority | Text | Yes | The name of the transit authority | Metro RC |
| Issue Date | Date | Yes | Date the red card was issued. | Metro RC |
| Expiry Date | Date | Yes | Date the red card expires.  The system will automatically transition status to Expired on this date. | Metro RC |
| Lines | Text | No | The specific transit lines, stations, or zones covered by the red card. | Metro RC |
| Card Document | File | No | Scanned copy of the red card (PDF or image). Accessible to managers and supervisors only. | Metro RC |
| Renewal Reminder | Number | No | Days before expiry to send a reminder to the creating manager.  Default: 14 days. | Metro RC |

 

After filling in the form, the manager can:

* Save as Draft – stores the record without notifying anyone. Not visible to officers.  
* Publish the record \- the record status is charged to Active  
* When published \- Push notification is sent to officers in the relevant community  
* Question \-do we need an approval process, or the record published automatically?

#### **4.11.2 Review POI / TI / MRC list** {#4.11.2-review-poi-/-ti-/-mrc-list}

The list available for the manager display all  records:

- Filtered to the manage communities by default  
- Draft and Active only records (with an option to change the status selection)

Each row in the list represents one individual record.

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Record ID | Text |  |
| Photo (thumbnail) | Image | First uploaded photo displayed as a small thumbnail. |
| Name | Text | Full name (First Last)  |
| Record Type | Badge | POI / Trespass / Metro Red Card.  Colour-coded for each one of the types |
| Threat Level | Badge | Low / Medium /High / Critical Colour-coded (grey, yellow, orange, red) |
| Sites | Text list | Community names where the record is active. |
| Status | Badge | Draft / Active / Expired / Inactive / Archived. |
| Expiry Date | Date | Shown for Trespass and Metro Red Card records.  Highlighted if within 14 days; red if expired. |
| Last Updated | Date |  |
| Actions | Icon buttons | View / Edit / Inactive |

The list is sorted by creation date, filter options (multi select):

* Record Type   
* Status  
* Threat Level   
* Site / Community  
* Expiry: Expired /Expiring within 30 days  
* Free-text search: searches across name, aliases, Record ID, and description

The manager can select one of the records and view its details. The manager should be able to access:  

* Version History – a log of all changes, showing what changed, who changed it, and when.   
* Export – generates an internal PDF of the record for sharing with law enforcement or legal counsel (Admin only). 

#### **4.11.3 Edit a POI / TI / MRC record** {#4.11.3-edit-a-poi-/-ti-/-mrc-record}

The admin/manager should be able to edit records he authorised to view.

The following fields can be edited at any time:

* Internal Notes  
* Renewal Reminder days  
* Watch Level Review Date (POI records only)  
* Related Incident IDs

Editing the rest of the fields will create a new version of the record.

Question \-do we need an approval process?

##### 4.11.3.1  Inactive a Record {#4.11.3.1-inactive-a-record}

A manager can revoke an Active record when the individual is no longer a concern, the trespass order has been lifted, or the Metro red card has been cancelled early. Revoking requires:

* Selecting Inactive from the record’s action menu.  
* Entering a mandatory revocation reason  
* Confirming the action.


On inactivating:

* Record status changes to Inactive immediately.  
* The record is removed from all officer devices.  
* A push notification is sent to all officers that the record has been inactive.   
* The record is no longer visible in the default list view.

Note: Records cannot be permanently deleted. An inactive or expired record remains in the system Admins can archive records older than a configurable threshold to remove them from the active registry list.

#### **4.11.4 Export a POI / TI / MRC record (admin only)** {#4.11.4-export-a-poi-/-ti-/-mrc-record-(admin-only)}

An admin can export a record as a PDF for official purposes.

* The exported PDF is watermarked with the admin’s name, the export date/time, and the text “CONFIDENTIAL – AUTHORISED USE ONLY”.  
* Client-facing content (photos, summary, threat level) is included. Internal Notes are excluded  
* Every export is logged with the admin name and timestamp.

Question: is this enough? Any other legal requirement?

#### **4.11.5 Record lifecycle** {#4.11.5-record-lifecycle}

| Status Name | Change Trigger | Action |
| :---- | :---- | :---- |
| Draft | The record is created and saved but not yet published. | Visible to creating managers and admins only. Not visible to officers. No notifications sent. |
| Active | The record is published | The record is immediately visible in the officer app at specified sites. Push notification sent to officers |
| Expired | The Expiry Date on a Trespass Order or Metro Red Card is reached.  System transitions status automatically on the expiry date. | The record is removed from the records list and not visible to officers. A renewal reminder is sent to the creating manager if configured.  |
| Inactive | A manager manually inactivates the record before its expiry date. | The record is removed from the records list and not visible to officers. A push notification sent to officers. Inactivate reason is recorded.  |
| Archived | Admin archives an Expired or Revoked record older than the configured archive threshold  | Removed from the default registry list view. Still accessible via the ‘Archived’ filter. Cannot be re-activated. |

#### **4.11.6 Push Notification \- POI & Trespass** {#4.11.6-push-notification---poi-&-trespass}

The following push notifications are generated by the POI & Trespass module. 

| Push Message Name | When | Who Receives It |
| :---- | :---- | :---- |
| New POI Record – Active | A record is published to one or more communities. | All officers checked in (or allocated to an upcoming shift within 24 hours) at the affected communities receive a push notification. Notification includes name, record type, and threat level. Leads to the record detail view. |
| POI Record Updated | An edited record is has a new version  | All officers at affected communities receive a push notification Leads to the record detail view. |
| POI Record Inactivated | A manager inactivate an Active record. | All officers receive a push notification that the record has been inactivated and should be disregarded.  |
| Record Expiring Soon | A Trespass Order or Metro Red Card is within the configured renewal reminder window (default: 14 days). | The creating manager (and admin) receives a push notification and email reminder with a link to the record for review or renewal. |
| Record Expired | A Trespass Order or Metro Red Card reaches its expiry date. | The creating manager (and admin) receives a notification that the record has expired. Officers receive a notification that the record has been removed  |

### **4.12 Incident Reports Templates** {#4.12-incident-reports-templates}

The Incident reports enable officers to document incidents, daily activity, and site observations from their mobile app. Reports can include structured data fields, narrative text, photos, video, supporting documents, all tied to an exact site location. Managers configure the report templates, control which sections are included, and decide whether completed reports are sent directly to clients or routed through an internal review step first.

The manager will be able to review existing templates, or create a new one.

#### **4.12.1 Template List** {#4.12.1-template-list}

The templates list displays all templates for the manager’s communities, and includes the following:

| Parameter Name | Type | Comments |
| :---- | :---- | :---- |
| Template Name | Text | Unique name within the community. |
| Community / Site | Text | The community this template is assigned to, or ‘Global’ if available across all communities. |
| Report Category | Text | Incident Daily Activity |
| Sections | Number | Count of sections defined in this template. |
| Status | Badge | Active Draft Archived |
| Last Modified | Date | Date of the most recent change. |
| Actions | Buttons | Edit  Duplicate Archive Format |

The manager will be able to \-

- Review the list  
- Open an existing template  
- Edit a template  
- Create a new one by duplicating an existing template  
- Archive template  
- Format a template

#### **4.12.2 Create / Edit a template** {#4.12.2-create-/-edit-a-template}

Clicking  “Add New”, ‘Edit’ or “Duplicate” opens the Template Editor. 

The editor has two panes: a section list on the left and a field editor on the right.

##### 4.12.2.1  Template Header Settings {#4.12.2.1-template-header-settings}

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Template Name | Text | Yes | Must be unique within the community. Up to 80 chars |
| Report Category | Dropdown | Yes | Options: Incident Daily Activity Custom |
| Community / Site | Array text | Yes | Multi selection option (with “all” option) The communities where this template is available.  |
| Report Title Format | Text | Yes | A title pattern for generated reports. Supports placeholders: {date}, {community}, {officer}, {template\_name}, {incident\_type}. Example: “Incident Report \- {community} \- {date}”. |
| Status | Toggle | Yes | Options: Draft (new reports will be saved as drafts) Active (visible to officers) |
| Review Before Client | Toggle On/Of | Yes | If On \- completed reports using this template are routed to manager review before being sent to the client. Default: Off |
| Allow Officer Editing After Submit | Toggle On/Off | Yes | If On, officers can edit a submitted report before a manager picks it up for review. Default: Off. |

##### 4.12.2.2  Template Sections Settings {#4.12.2.2-template-sections-settings}

Each template has an ordered list of sections. The manager can add, reorder (drag-and-drop), and remove sections. Each section has the following settings:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Section Title | Text | Yes | The heading displayed above this section in the report.  Up to 80 characters.  |
| Section Enabled | Toggle On/Off | Yes | Default: On When Off, this section is hidden from the officer’s form and excluded from the generated report entirely. |
| Required | Toggle On/Off | Yes | Default: On If On, the officer cannot submit the report without completing this section.  If Off, the officer may skip it. |
| Client-Visible | Toggle On/Off | Yes | Default: On If Off, this section is excluded from the client-facing version of the report. |
| Section Order | Drag handle | Auto | The display order of sections in both the officer form and the final report.  Reorderable by drag-and-drop. |
| Section fields | Array | Yes | Multiple selection \- the system present **all Incident fields** \+ and option for custom field When choosing custom (see below) |

###### 4.12.2.2.1  Sections fields selection {#4.12.2.2.1-sections-fields-selection}

The manager can select the section fields from all incident fields, or add his own custom fields (one or many).  
When choosing a custom field, the manager should \- 

- Add field label  
- Field description  
- Add type \-   
  - Text \+ max chars number  
  - Date  
  - Location  
  - Dropdown \- specify the dropdown values \+ single select / multi select  
  - File upload \- specify document \+max number of files  
  - Digital signature (question: is this needed?)

Field order within a section is set by drag-and-drop in the Template Editor. 

Fields can be reordered independently of section order.

**Note: If needed, a template (sections & fields) can be generated in the system, to be default one for all customers \- Code4 to decide and if so provide default template info.**

##### 4.12.2.3  Saving, Publishing and Archiving a Template {#4.12.2.3-saving,-publishing-and-archiving-a-template}

* The manager can save a template and continue editing. In that case, the template status will be: Draft  
* Once the manager change the status to “Active” \- the template will be visible to the officers  
* The manager can archive a template \- the template will not be available for new reports. Reports already created using the template retain their structure and display correctly; archiving does not alter historical records.   
* An archived template can be restored to Active status.

#### **4.12.3 Template formatting** {#4.12.3-template-formatting}

When a report is delivered to a client or exported as a PDF, it is formatted into a professional document. The manager controls the formatting settings at the template level.

##### 4.12.3.1  Report Style Settings (per Template) {#4.12.3.1-report-style-settings-(per-template)}

The manager should populate the following \-

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Company Logo | Image upload | No | Logo displayed in the report header.  |
| Accent Colour | Hex colour | No | Used for section heading bars, dividers, and the header strip.  Should be: Code4 brand colour. |
| Header Layout | Dropdown | No | One of the options: Compact (logo \+ title on one line) Standard (logo left, title and meta-data right) Full-width banner. |
| Font | Dropdown | No | Arial (default) Calibr Times New Roman.  |
| Page Numbering | Toggle | No | Show page numbers in the footer. Default: On. |
| Confidentiality Footer | Text | No | Will appear on each page. For example:  “CONFIDENTIAL – FOR AUTHORISED RECIPIENTS ONLY” to every page footer.  |
| Date Format | Dropdown | No | MM/DD/YYYY | DD/MM/YYYY | YYYY-MM-DD. Applies to all dates in the generated report. |
| Section Breaks | Dropdown | No | Options: Each section starts on a new page Sections are continuous (separated by a line only).  Default: Continuous. |
| Include Cover Page | Toggle | No | Generates a dedicated cover page with the report title, site name, officer name, date, and logo. Default: Off. |

## 

## **5 Management System \- Super Admin View**   {#5-management-system---super-admin-view}

The admin’s management system is the same as the Operator system, with additional capabilities allowed only for the system admin. It allows the admin to manage the system settings and users.

*To be decided by each customer \- whether the admin and operator have the same privileges, or separated.*

### **5.1 General Management**  {#5.1-general-management}

· System login is done via email and password (the email he registered to the system with).   
· The system is for the admin users only. 

#### **5.1.1 Main menu**  {#5.1.1-main-menu}

The main menu contains the following options, with the admin **addition capabilities**

1. Dashboard \- main screen   
2. Communities Management   
3. Officers Management   
4. Calls Table   
5. **Users Management**  
6. **Settings** 

### **5.2 Users Table**  {#5.2-users-table}

This is a users table which can login to the management system. Currently the role types are \-

1. Admin  
2. Manager

3. Planning  
4. Logistics  
5. Finance  
   

#### **5.2.1 Users List**  {#5.2.1-users-list}

Above the list there is a total number of users in the table. The list is sorted by user first name. The table’s columns are: 

| Parameter Name  | Type  | Explanation |
| :---- | ----- | :---- |
| User First Name  | text |  |
| User Last Name  | Text |  |
| Mobile number  | phone |  |
| email  | email  | mandatory, used to login the system |
| Password  | string  | only initial password. The user will have to change it during the first login and it will no longer be displayed here. |
| Role type  | text  | Admin  Manager  TBD other roles (and to discuss functionality) Planning Logistics Finance |
| Registration date  | date  | the date this admin has been added to the system. |
| Active  | yes/no |  |

#### **5.2.2 Add New User**  {#5.2.2-add-new-user}

Above the table there is an Add button which opens the Add New User window. The parameters are: 

| Parameter Name  | Type  | Mandatory  | Comments |
| ----- | ----- | ----- | :---- |
| User First Name  | text  | yes |  |
| User Last Name  | Text  | no |  |
| Mobile number  | phone  | no |  |
| email  | email  | yes  | mandatory, used to login the system |
| Password  | string  | yes  | only initial password. The user will have to change it during the first login. |
| Role type  | text  |  | Currently only admin. |

A user is added in Active state and today is the registration date. 

#### **5.2.3 Edit a User**  {#5.2.3-edit-a-user}

Clicking on the edit button next to a user in the table, opens the user details window and enables the admin to edit details: 

| Parameter Name  | Type  | Editable  | Comments |
| ----- | ----- | :---- | :---- |
| User First Name  | text  | yes |  |
| User Last Name  | Text  | yes |  |
| Mobile number  | phone  | yes |  |
| email  | email  | yes  | it is used by the user to enter the system, therefore if it is changed, an initial password must be given as well and the user must login again to the system. |
| Password  | string  | yes  | only initial password. The user will have to change it during the first login. |
| Role type  | text  | no |  |
| Registration date  | date  | no |  |
| Active  | yes/no  | yes |  |

##### 5.2.3.1 Reset Password  {#5.2.3.1-reset-password}

Any admin user can reset another user's password. This action changes the user’s password back to the initial one and the user will have to login again and change it. 

#### **5.2.4 Delete a user** {#5.2.4-delete-a-user}

The user can be deleted as long as he is not the only user in the table. One admin user must remain in the users table. 

The same condition applies to deactivating a user. 

#### **5.2.5 Sort / Filter**  {#5.2.5-sort-/-filter}

The admin can sort the table according to each data column by clicking on its header. 

The admin can filter the table according to the following options: 1\. Active/inactive   
In addition there is also an option for free search in all the table’s columns. 

### **5.3 GPS & Tracking Settings**  {#5.3-gps-&-tracking-settings}

The Admin can configure the following GPS-related parameters:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| GPS Transmission Interval (Normal) | Seconds | No | How often the officer app sends a location update during a standard patrol. Default: 30 s. Range: 10-120 s. |
| GPS Transmission Interval (Emergency) | Seconds | No | Update interval when an officer is responding to an emergency call. Default: 10 s. Range: 5-30 s. |
| GPS Stale Alert Threshold | Minutes | No | How long without a GPS update before an amber alert is triggered. Default: 2 min. |
| Location History Retention | Days | No | How long raw GPS tracks are stored. Default: 90 days. |
| Map Auto-Refresh Interval (Portal) | Seconds | No | How often the Live Tracking map reloads data in the manager portal. Default: 30 s. |
| Patrol Compliance Alert Threshold | Minutes | No | Minutes overdue at a waypoint before triggering a skip alert. Default: 15 min. |
| Emergency ETA Recalculation Interval | Seconds | No | How often ETA is recalculated using the Maps API during an emergency response. Default: 60 s. |
| Map Provider | Dropdown | No | Google Maps (default) |

### **5.4 General Settings**  {#5.4-general-settings}

#### **5.4.1 Service/Incident types and Maintenance reports types** {#5.4.1-service/incident-types-and-maintenance-reports-types}

The admin can maintain 2 lists \-  
Service / Incident types  
Maintenance reports types

The admin should be able to add new types, edit type name, delete a type.  
Once the admin delete a type it will no longer display to the user on the New Call process.

#### **5.4.2 Asset types** {#5.4.2-asset-types}

In this page the admin maintains all asset types, and should populate the following information per Asset type \-

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Name | text | yes |  |
| Icon | image | yes | upload an icon |
| Colour |  | yes |  |

#### **5.4.3 Post Order Sections types** {#5.4.3-post-order-sections-types}

In this page the admin maintains a list of Pose Order sections (to be used when creating a new Post Order). The information for each section type:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Section Type | text | Yes |  |
| Client visible | Toggle | Yes | Yes/No Default is No |
| Short description | Text | No |  |
| Active/Inactive |  |  | Only Active types will appear in the “Add Section” option when creating a  post order. Existing Post Orders using the type are unaffected. |

Following are suggested post order section types (to be added as a basic list)

| Section Name | Client-Visible  | Description |
| :---- | :---- | :---- |
| General Information | Yes | Site overview, post location, hours of coverage, and key contacts. This section is almost always shared with the client. |
| Duties & Responsibilities | Yes | Step-by-step description of the officer’s tasks during the shift. Can include time-specific duties (e.g. hourly rounds at 0:00, 1:00, etc.). |
| Emergency Procedures | Yes | Actions to take in response to fire, medical emergency, security breach, and other defined scenarios. Includes escalation paths and 911 interface instructions. |
| Access Control Rules | Yes | Which entry points the officer controls, authorised access lists, visitor management procedures, and key/fob handling. |
| Patrol Instructions | No | Patrol route guidance, areas of special attention, timing requirements, and any patrol-specific equipment. Marked No by default as tactical patrol details are typically not shared with clients. |
| Use of Force & Legal Guidance | No | Jurisdiction-specific use-of-force policy, de-escalation requirements, and liability reduction guidance. Not shared with clients. |
| Reporting Requirements | Yes | What incidents must be documented, which forms to use, reporting deadlines, and escalation thresholds. |
| Equipment & Uniform | No | Required equipment list, uniform standards, and vehicle assignment. Not typically shared with clients. |
| Communication Protocols | No | Radio channels, dispatch contact details, escalation chain, and on-call supervisor contacts. |
| Persons of Interest | No | Trespass orders, banned individuals, Metro red cards, and persons of interest relevant to this site. Never shared with clients. |
| Client-Specific Instructions | Yes | Custom instructions provided by or agreed with the client. Always shared with the client as this section is authored with their input. |
| Vendor & Contractor Rules | Yes | Procedures for admitting and supervising vendors, delivery personnel, and contractors on site. |

#### **5.4.4 Push notifications settings** {#5.4.4-push-notifications-settings}

The admin should be able to define the push notifications methods in the system.

1. Select the options \- in app, email, mobile (default \- all)  
2. Select the activities that trigger a notification (default \- all)  
3. Define the notification sender name (default \- Contractor name)  
4. Define notification title  
5. Text will be provided by the client and hardcoded in the system. 

Example, default texts \-

| Trigger | Notification Title | Notification Text | Link | Who receives it |
| :---- | :---- | :---- | :---- | :---- |
| New emergency call | A new call | \#service\_category was opened by \#call\_creator | Call ID page | Assigned officer |
| Call status change to Accepted | Call accepted | Your call was accepted by the \#officer\_name | Call ID page | Call creator Site manager |
| call was edited | Call edit | \#call\_number was edited | Call ID page | Assigned officer |
| Call status change to  resolved  | Call resolved | \#call\_number was resolved | Call ID page | Call creator Site manager |
| Post Order Published | A new Post Order is published for a post (version 1.0). | A new Post Order is available | Post Order page | Officers currently allocated to the post  |
| Post Order Updated  | A version update is published to a post order | Post Order was updated | Post Order page | Officers currently allocated to the post  |
| New POI Record – Active | A record is approved and published to one or more communities. | New POI was created: \#name, \#record\_type, \#threat level.  | The record detail view in the officer app. | All officers checked in |
| POI Record Updated | An edited record, a new version is published. | \#name, \#record\_type has been updated.  | The record detail view | All officers at affected communities  |
| POI Record Inactivated | A manager inactivated an Active record. | \#name, \#record\_type has been inactivated.  |  | All officers  |
| Record Expiring Soon | A Trespass Order or Metro Red Card is within the configured renewal reminder window (default: 14 days). | \#name, \#record\_type expired soon. | A link to the record for review or renewal. | The creating manager (and admin) with  |
| Record Expired | A Trespass Order or Metro Red Card reaches its expiry date. | \#name, \#record\_type expired.  |  | The creating manager (and admin) Officers  |
| Incident Report submitted |  |  |  | The responsible manager |
| Incident Report Approved |  |  |  | The officer that generated the report |
| Incident Report required changes |  |  |  | The officer that generated the report |
| Incident Report Delivered |  |  |  | The client that opened the call |

#### 

#### **5.4.4 POI & Trespass Settings**  {#5.4.4-poi-&-trespass-settings}

The Admin can configure the following parameters from Settings – POI & Trespass:

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Renewal Reminder Lead Time | Days | Yes | Days before Trespass/Red Card expiry to send renewal reminder.  Default: 14 days |
| Archive Threshold | Months | Yes | How many months after Expiry or Inactivating before a record becomes eligible for archiving.  Default: 24 months. |
| PDF Export Enabled | Toggle | Yes | Whether admin PDF export is available. Default: On. |
| Default response guidance texts | Text | No | Can be configured for each record type, Edit the body text of the response guidance Add a version note explaining what changed and why |

Examples for guidance texts (can be set as default):

| Record Type | Default Response Guidance Text |
| :---- | :---- |
| Person of Interest | This individual is flagged for awareness only. Do not approach, detain, or confront. Observe and report. If you observe this individual on site, document their presence, actions, and any interactions. Notify your supervisor immediately. |
| Trespass Order | This individual is subject to a formal trespass order and is prohibited from entering the specified property. If you observe this individual on site: (1) Do not use physical force unless lawfully justified. (2) Verbally advise the individual that they are trespassing and must leave. (3) If they refuse to leave, contact law enforcement. (4) Document the encounter using the incident reporting tool.  |
| Metro Red Card | This individual holds an active transit exclusion (Metro Red Card) and is prohibited from the specified transit facilities and surrounding areas. If you observe this individual: (1) Verbally advise them of their exclusion and request they leave. (2) If they refuse, contact Metro Transit Authority dispatch and local law enforcement. (3) Document the encounter. Do not use physical force unless lawfully justified. |

#### 

#### **5.4.5 Working hours** {#5.4.5-working-hours}

Different parameters will be configured and maintained by the admin

- Officers: Max working hours per day (default 8\)

### 