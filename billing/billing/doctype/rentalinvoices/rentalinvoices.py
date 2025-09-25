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
    arg: CSV list of invoice numbers
    """
    invs = invlist.split(',')
    InvoiceIf.ApproveInvoice(invs)
    return {
        "status": "success",
        "message": "Approved: " + invlist
    }


# Approve button on invoice page
@frappe.whitelist()
def approve_and_email_invoice(invNumber):

    res = InvoiceIf.ApproveInvoice([invNumber])
    return {
        "status": "success",
        "message": res
    }

@frappe.whitelist()
def recalculate_invoice(invNumber):

    res = InvoiceIf.RegenerateInvoice(invNumber)
    return {
        "status": "success",
        "message": "Regenerated " + invNumber
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
def getAppreciationList():
    return {"message": "Hello from backend!"}
