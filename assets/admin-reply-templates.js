/* Admin-only generic reply starting points. Review facts before sending.
   These are static templates, not private data or automatic replies. */
window.SlashpromoReplyTemplates=Object.freeze([
  {id:"opd",label:"Doctor OPD timings",text:"Thank you for contacting SlashPromo. We can help you find the published OPD information for [doctor/clinic] in [city]. Please refer to [verified profile link] for the latest listed schedule, and confirm the appointment or timing directly with the clinic before travelling."},
  {id:"contact",label:"Doctor / clinic contact",text:"Thank you for your enquiry. The published contact information for [doctor/clinic] in [city] is [verified public number or official link]. Please contact the clinic directly to confirm current availability."},
  {id:"appointment",label:"Appointment information",text:"Thank you for reaching out. To arrange an appointment with [doctor/clinic], please follow the verified instructions at [official profile link]. Appointment availability and confirmation are handled by the provider. Please confirm the details directly."},
  {id:"correction",label:"Profile or timing correction",text:"Thank you for bringing this to our attention. Our team will review the information on [page/profile] against the provider's current published details. We will update the listing when verified. Please share only public, non-sensitive corrections."},
  {id:"followup",label:"General enquiry follow-up",text:"Thank you for contacting SlashPromo. We have received your enquiry about [topic]. We are reviewing the available public information and will follow up when it has been verified. For urgent medical needs, please contact a qualified local healthcare service."}
]);
