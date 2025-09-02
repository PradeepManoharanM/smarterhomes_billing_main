
import csv
import json
import sys
from datetime import datetime, timedelta
frappe = None
import mysql.connector

from InvoiceSvc import  initInvoicer, insertDoc, toFloat, fetchContract, updatedoc

rdsServer = "smdb.c59hcehledvt.ap-south-1.rds.amazonaws.com"
invCSV = []	# Invoice CSV records from file

Months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

# Search list of dict. Return index if found, else -1
def dictSearch(listName, keyName, value):
		for rec in listName:
				if keyName in rec and rec[keyName] == value:
						return rec
		return {}



# Get email for invoice receipients from Lattoo DB, for 1st time upload
def getEmail (cur,socName, societyId, cafId):

	cclist = []

	qry = "select email from tbl_society_email_settings where caf_id = %s" % (cafId,)	# Can be multiple
	cur.execute(qry)
	resp = cur.fetchall()
	for r in resp:
		if r[0] in cclist:
			continue
		cclist.append(r[0])

	# qry = "select email from tbl_society_contact where societyId = %s" % (societyId,) # Multiple
	qry = "select rep_email, rwa_phone, rwa_mobile from customer_application_forms where caf_id = %s" % (cafId,)
	cur.execute(qry)
	resp = cur.fetchone()
	if resp is None:
		print ("Email/phone for Property " + socName + "Not found", file=sys.stderr)
		return '','',''

	phone = resp[1] if len(resp[1])>=10 else resp[2] if len(resp[2])>=10 else ''

	return resp[0], phone, cclist

# Upload invoice from CSV (Excel sheet) to frappe
def uploadInvoice(sheet, invDate):

	docs =[]
	fp = open(sheet)
	crecs = csv.DictReader(fp)
	for crec in crecs:
		propName = crec['Project Name']
		if propName == '':		# Extra line for additional meters
			doc = docs[-1]		# Last property
			doc['meter_count'] += ',' + crec['No of Meter']
			doc['rates'] += ',' + crec['Service Rate']
		else:
			doc = {
				'doctype': 'RentalInvoices',
				'inv_date': invDate,
				'property_name': propName,
				'inv_number': crec['Invoice Number'],
				'prev_balance': crec['Previous Due'],
				'monthscharge': crec['Amount'],
				'sgst': toFloat(crec['GST @ 18%'])/2,
				'cgst': toFloat(crec['GST @ 18%'])/2,
				'discount': crec['Waiveroff/ Discount Allowed'],
				'late_fee': crec['Interest on late fee 2.5%'],
				'total_payable': crec['Total Payable'],
				'amt_rcvd': crec['Amount Received In the month of Jul 2025'],
				'tds': crec['TDS'],
				'meter_count': crec['No of Meter'],
				'rates': crec['Service Rate'],
				'inv_status': 'Generated',
			}
			docs.append(doc)

	for doc in docs:
		res = insertDoc(doc)
		print (doc["property_name"])
		if not res['ok']:
			print("Failed invoice for " + propName, str(res))

# Upload contracts from CSV (Lattoo DB) to Frappe
def uploadContracts(inv):

	lastprop = ''
	fp = open(inv)
	crecs = csv.DictReader(fp)
	for crec in crecs:
		prop = crec['Project Name']
		if prop == '':
			prop = lastprop
		else:
			lastprop = prop

		apprRate = float(crec['Appr Rate']) if crec['Appr Rate'] != '' else 5
		apprPeriod = 12 if apprRate == 5 else 24
		try:
			doc = {'doctype': 'RentalContracts',
			"property_name": prop,
			"orig_rent": crec['OriginalRate'],
			"start_date": datetime
				.strptime(crec['BillingStart'], '%d-%b-%Y')
				.strftime('%Y-%m-%d'),
			"appr_rate": apprRate,
			"appr_period": apprPeriod,
			"meter_count": int(crec['No of Meter']),
			"plantype": crec['Plan'],
			"water_type": crec['Water Type'],
			"appr_month" : Months.index(crec['Appr Month']) + 1,
				   }
		except Exception as e:
			print(e)
		print (prop)
		res = insertDoc(doc)
		if not res['ok']:
			print("Insertion Failed : " + prop + str(res))


# Get name, plan, water type from Invoice
# Address, email, contact name, from DB - tbl_society_master
# props: societyId, caf_id, societyName	(from DB)
# If newOnly, ignore if property already present in Frappe
def uploadProps(inv, newOnly = False):
	invlst= []
	dblist = []
	currentProperties = []

	if newOnly:
		contracts = fetchContract('All')
		currentProperties = [ c['property_name'] for c in contracts]

	with open(inv) as fp:
		crecs = csv.DictReader(fp)
		invlst = [r for r in crecs if r["Project Name"] != '']

	# Construct property name list
	plist = "(" + ','.join([ '"%s"' % p["Project Name"] for p in invlst]) + ")"
	db = mysql.connector.connect(host=rdsServer, user="admin",
								 password='smdb1234', database="nuclious")
	cur = db.cursor()
	qry = "select societyName, societyId, caf_id, address, contactPerson, contactPh1 from tbl_society_master where societyName in %s" % plist
	cur.execute(qry)
	dblist = cur.fetchall()
	# db.close()
	# Create doctype records
	for prop in invlst:
		propname = prop["Project Name"]
		if propname in currentProperties:
			continue	# Exists in frappe
		doc = {
			'doctype': 'RentalCustomers',
			'property_name': propname,
			'city': prop["City"]
		}
		# Search dblist for prop name
		dbr = None
		for r in dblist:
			if r[0] == propname:
				dbr = r
				break
		if dbr is None:
			print ("*** Property %s not found in DB" % propname, file=sys.stderr)
			continue

		doc |= {
		'address': dbr[3],
		'contact_name': dbr[4],
		}
		cafId = dbr[2]

		# Get email ids
		email, phone, cclist = getEmail(cur, propname, dbr[1], cafId)
		doc = {'doctype': 'RentalCustomers', 'property_name': propname, 'name': propname,
			    'email': email, 'email_cc': '\n'.join(cclist) }
		if phone is not None and phone != '':
			doc['phone'] = '+' + phone

		# res = updatedoc(doc)
		# if not res['ok']:
		# 	print ("%s: Error", propname)
		# print (propname)
		print (doc["property_name"])
		res = insertDoc(doc)
		if not res['ok']:
			print ("Insertion Failed : " + propname)

	cur.close()
	db.close()


def addGstin():
    with open("/tmp/gstn.csv") as fi:	# csv file with propname,gstn
        dat = fi.read()
    lns = dat.split('\n')[1:]
    for l in lns:
        p = l.split(',')
        res = frappe.get_doc('RentalCustomers', p[0])
        if not res['ok']:
            print(p[0])
        else:
            doc = res['response']
            doc['gstin_number'] = p[1]
            res = frappe.update(doc)
            if not res['ok']:
                print("Failed to update: " + p[0])

def CreateOldInvoices(tabFile, pdflistfile):
	pwd = '/home/badusha/shred-bk/Shared/Work/SmarterHomes/neo/Propman/Invoicing/final/'
	fp = open(pwd + tabFile)
	crecs = csv.DictReader(fp)
	doc = {'doctype' : 'OldInvoices'}
	fpdf = open(pwd + pdflistfile)
	pdfList = fpdf.read().split('\n')

	invDocs = {}	# Format: {prop: { inv_date: { 'inv_number': ...., .... }, ...}, ... }
	for rec in crecs:
		invMmm, invYYYY = tuple(rec['Billing Period'].split(' '))
		invMM = Months.index(invMmm) + 1		# Jan to 01
		invYear = int(invYYYY)
		pdfprefix = rec['invoice_cycle_id']
		# Find the pdf file from pdflist
		pdfName = ''
		for p in pdfList:
			if p.startswith(pdfprefix) and p > pdfName:
				pdfName = p
		invMonth = "01-%02d-%04d" % (invMM, invYear)	# MM-DD-YYYY
		propName = rec['societyName']
		prevPayment = rec['prev_payment']
		fields = { 'inv_number': rec['Invoice Number'], 'pdf': pdfName }
		prevMonth = "%04d-%02d-%02d" % ((int(invYear) - 1, 12, 1) if invMM == 1 else (invYear, invMM -1, 1))
		# Add prevPayment to prev invoice record
		if propName in invDocs:
			if prevMonth in invDocs[propName]:
				invDocs[propName][prevMonth] = prevPayment
			invDocs[propName] |= {invMonth: fields}
		else:
			invDocs[propName] = {invMonth : fields}

	print (json.dumps(invDocs))

def uploadOldInvoice(jsonFile):
	with open(jsonFile)	as jf:
		invDocs = json.load(jf)

	# Insert property-wise
	totalDocs = 0
	for prop in invDocs:
		docs = []
		for mon in invDocs[prop]:	# For each month
			doc = { 'doctype' : 'OldInvoices', 'property_name' : prop, 'inv_date': mon}
			doc |= invDocs[prop][mon]	# Add other fields
			docs.append(doc)
			totalDocs += 1
			insertDoc(doc)

		#frappe.insert_many(docs) 
		print ("%d: %d: %s" % (totalDocs, len(invDocs[prop]), prop))

def uploadFromLattoo():
	invCsv = "../final/JuneFinal2025.csv"
	# invCsv = "/tmp/June2025.csv"
	# uploadProps(invCsv)
	# addGstin()
	# print('Uploading Contracts', file=sys.stderr)
	# uploadContracts(invCsv)
	# print('Uploading Invoices', file=sys.stderr)
	# uploadInvoice(invCsv, '2025-07-1')

	#CreateOldInvoices('Final Invoice Ledger DR2.csv', 'pdflist.txt' )
	uploadOldInvoice('oldinvoices.json')

if __name__ == '__main__':
	initInvoicer()
	uploadFromLattoo()

