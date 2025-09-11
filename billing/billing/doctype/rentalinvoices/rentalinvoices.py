# Copyright (c) 2025, Frugal Scientific and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
import requests



class RentalInvoices(Document):
	pass


@frappe.whitelist()
def approve_action(docname):
    # doc = frappe.get_doc("RentalInvoices", docname)
    frappe.msgprint(f"Custom approval logic executed for {docname}")
    return True
    

@frappe.whitelist()
def calculate_invoice(doc):
    doc = frappe._dict(frappe.parse_json(doc))
    
    frappe.msgprint(_("Invoice recalculated for: {0}").format(doc.get("name")))

@frappe.whitelist()
def approve_and_email_invoice(doc):
    doc = frappe._dict(frappe.parse_json(doc))
    
    frappe.msgprint(_("Invoice approved and email sent for: {0}").format(doc.get("name")))

@frappe.whitelist()
def view_invoice(doc):
    doc = frappe._dict(frappe.parse_json(doc))
    
    frappe.msgprint(_("Viewing invoice: {0}").format(doc.get("name")))



@frappe.whitelist()
def call_recalculate_invoice(property_name, date):
    if property_name and date:
        frappe.msgprint(f"Recalculate invoice for {property_name} on {date}")
    return property_name

@frappe.whitelist(allow_guest=True)
def payment_receive(param1=None, param2=None):
    return {
        "message": f"You sent param1={param1}, param2={param2}"
    }
