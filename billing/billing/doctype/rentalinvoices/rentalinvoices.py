# Copyright (c) 2025, Frugal Scientific and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
import requests

from billing.utils.Invoicer import InvoiceIf


class RentalInvoices(Document):
	pass

count = 0

# Handler for approve action. Arg: List of inv_numbers
@frappe.whitelist()
def approve_action(invlist):
    """
    Approve multiple RentalInvoices in one call.
    arg: list of invoice numbers
    """
    InvoiceIf.ApproveInvoice(invlist)
    invs = ",".join(invlist) 
    return {
        "status": "success",
        "message": "Approved: " + invs
    }


# Approve button on invoice page
@frappe.whitelist()
def approve_and_email_invoice(invNumber):

    InvoiceIf.ApproveInvoice([invNumber])
    return {
        "status": "success",
        "message": "Approved" + invNumber
    }

@frappe.whitelist()
def recalculate_invoice(invNumber):
    frappe.msgprint("Approve Action: " + invNumber)

    return {
        "status": "success",
        "message": f"Success with " + invNumber
    }

@frappe.whitelist()
def appreciation_list():
    Csv = InvoiceIf.GetAppreciationList()
    return {
        "status": "success",
        "message": Csv
    }

@frappe.whitelist(allow_guest=True)
def payment_receive(param1=None, param2=None):
    return {
        "message": f"You sent param1={param1}, param2={param2}"
    }



@frappe.whitelist()
def my_custom_method():
    return {"message": "New from backend!"}
