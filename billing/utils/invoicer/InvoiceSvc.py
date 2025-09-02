import frappeclient
from frappeclient import FrappeClient
import csv
import sys, os
from datetime import datetime, timedelta
import dateutil
from dateutil.relativedelta import relativedelta
frappe = None
from calendar import  monthrange
import locale
import boto3
import  sendemail

propmanDbServer = "frappedb.c59hcehledvt.ap-south-1.rds.amazonaws.com"
rtfTemplate = "./InvoiceTemplate.rtf"
monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
S3Client = None
def initInvoicer():
	global frappe
	host="https://propmandev.wateron.cc/"
	frappe = FrappeClient(host, api_key='f04a65911709227', api_secret='910c13234ede163')
	# frappe.authenticate('f04a65911709227', '910c13234ede163')
	locale.setlocale(locale.LC_NUMERIC, 'en_IN')

def insertDoc(doc):
	# return	{'ok': True}	### DRY RUN
	res = {}
	for attempts in (1,2,3,4):
		if attempts > 3:
			print(str(doc) + '\n' + str(res))
			return res
		res = frappe.insert(doc)
		if res['ok']:
			return res

# Upload file to AWS S3 bucket
def uploadToS3(localfile, bucket_name):
	global S3Client
	if S3Client is None:
		S3Client = boto3.client( 's3', aws_access_key_id="AKIA275VBO5XQQZ3EYIN",
        	aws_secret_access_key="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",
        	region_name="ap-south-1" )
	S3Client.upload_file(localfile, bucket_name, os.path.basename(localfile))
def updatedoc(doc):
	return frappe.update(doc)
def toFloat(floatStr):
	return float(floatStr.strip().replace(',',''))

# return empty string if fld is None
def None2Blank(fld):
	return '' if fld is None else fld
def fetchContract(propName):
	filters = None if propName == 'All' else {'property_name': propName}
	return frappe.get_list('RentalContracts', filters=filters)['response']

# Get invoice. Arguments: Either invNumber OR propName+invDate
def fetchInvoice(propertyName = None, invDate = None,  invNumber= None):
	if invNumber is not None:
		resp = frappe.get_doc('RentalInvoices', invNumber)
		return resp['response'] if resp['ok'] else None
	# Else, assume propertyName and invDate is given
	resp = frappe.get_list('RentalInvoices', filters={'property_name': propertyName, 'inv_date': invDate})['response']
	if len(resp):
		return resp[0]
	return None

# Retuns lists of rents and metercounts
def appreciatedRents(contract, prevInv, invDate):
	meterCounts = []
	rents = []
	rates = []
	try:
		prevRates = [float(x) for x in prevInv['rates'].split(',')] if prevInv else []
	except Exception as e:
		print ("Execpetion")
	for indx in range(len(contract)):
		batch = contract[indx]
		nMeters = int(batch['meter_count'])
		origRent = float(batch['orig_rent'])
		apprPeriod = int(batch['appr_period'])
		apprRate = float(batch['appr_rate'])
		[startYear, startMonth, startDay] = [int(x) for x in batch['start_date'].split('-')]
		[invYear, invMonth, invDay] = [int(x) for x in invDate.split('-')]
		monthDiff = (invYear - startYear) * 12 + invMonth - startMonth
		if monthDiff <= 0:  # billing not started
			continue
		if monthDiff == 1: 	# We are into 2nd month of billing.
			# Last month billing could be partial, so we ignore rates
			# from prevInv, so it will be tabken from contrct
			prevRates = []
		currentRentRate = origRent
		if monthDiff == 1 and startDay != 1:  # Partial month
			nDays = monthrange(startYear, startMonth)[1]  # Number of billable days
			rent = nMeters * origRent * (nDays - startDay + 1) / nDays  # prorate for number of days
			print ("Partial month for " + contract[indx]['property_name'])
		else:
			currentRentRate = prevRates[indx] if len(prevRates) > indx else origRent
			if (apprPeriod % 12) != 0:		# Appreciation other than 12,24 etc (eg.18)
											# In this case, ignore appr_month in DB and calculate it
				monthDiffForApprec = monthDiff - ( 0 if startDay <=15 else 1)
				if (monthDiffForApprec % apprPeriod) == 0:
					currentRentRate *= (1 + apprRate / 100.0)		# Appreciate rate
					print ("Non standard appreciation for property: " + batch['property_name'])
			else:	# apprPerio multiple of 12. Take the month from DB
				if invMonth == int(batch['appr_month']) and \
					(monthDiff % apprPeriod) < 5:	# We shall be within 5 months of calculated appr month
					currentRentRate *= (1 + apprRate / 100.0)
					print ("%s,%s,%s,%s,%f,%f" % (batch['property_name'], batch['start_date'], batch['appr_month'],
																	nMeters, prevRates[indx], currentRentRate))

			rent = nMeters * currentRentRate

		rates.append(round(currentRentRate,2))
		rents.append(round(rent,2))
		meterCounts.append(nMeters)

	return meterCounts,rents,rates

# Create a unique invoice number. Format KASL2526/08/0001
# 2526 is the financial year 2526; 08 is month (aug), and 0001 to 9999
# is the series for this month

__lastInvNumber = '' 			# Last generated inv number
# Invoice number format KASL2526/08/0001
def newInvoiceNumber(invDate):		# date : YYYY-MM-DD

	global __lastInvNumber
	month = int(invDate.split('-')[1])
	year = int(invDate.split('-')[0][2:])
	month = (month + 1) if month < 12 else 1	# If dec, make it jan, else next month
	currentPrefix = "KASL%02d%02d/%02d/" % ((year-1, year,month) if int(month) <=3 else (year, year+1,month))

	# 1st run of this function for this month. Get largest inv# from DB
	if __lastInvNumber == '' or __lastInvNumber[:12] != currentPrefix:
		# invoice number of this month = 1 + largest invoice number of this month in db
		pattern = currentPrefix + "____"
		qry = "SELECT MAX(inv_number) from tabRentalInvoices WHERE inv_number LIKE '%s'" % pattern
		invMax = frappeclient.dbQuery(qry)[0][0]		# Get all invoice numbers
		if invMax is None :	# No invoice so far in this month
			invSeries = 1
		else:	# largest Inv number
			invSeries = int(invMax[12:]) + 1
	else:
		invSeries = int(__lastInvNumber[12:]) + 1

	__lastInvNumber =  currentPrefix + ("%04d" % invSeries)
	return __lastInvNumber

# Create invoice for the given month, considering previous month's invoice
# Date format 'yyyy-mm-dd'
# If prev inv is available, it is used for rate and appreciation calcs, else taken from contrct
# Assumption: the meterlist of a property in prev invoice and contract are same
__PropertiesWithInvoices = { 'propNames' : [], 'month' : '' }		# List of properties where invoice for this month exist
def generateInvoice(propName, invDate, discount = 0, appreciationCheck=False):
	# Get contract
	contract = fetchContract(propName)
	if len(contract) == 0:
		err ="Contract for Propety " + propName + " not found"
		return err
	[invYear, invMonth, invDay] = [int(x) for x in invDate.split('-')]
	prevMonth = "%04d-%02d-%02d" % ((invYear - 1, 12, 1) if invMonth == 1 else (invYear, invMonth -1, 1))

	prevInv = fetchInvoice(propName, prevMonth)

	# TODO If prevInv is None, generate from contract...

	meterCounts,rents,rates = appreciatedRents(contract, prevInv, invDate)

	# Calculate this month's charge
	totalRent = 0
	for r in rents:
		totalRent += r

	# totalRent = round(totalRent)
	prev_balance = 0
	if prevInv:
		prev_balance = float(prevInv['total_payable']) - float(prevInv['amt_rcvd']) - float(prevInv['tds'])

	GST = 18.0/100
	SGST = GST / 2
	CGST = GST / 2
	latefee = 0 if prev_balance <= 0 else prev_balance * 2.5/100
	doc = {
		'doctype': 'RentalInvoices',
		'inv_date': invDate,
		'property_name': propName,
		'inv_number': newInvoiceNumber(invDate),
		'monthscharge': totalRent ,
		'prev_balance': prev_balance,
		'sgst': totalRent * SGST,
		'cgst': totalRent * CGST,
		'late_fee': latefee,
		'total_payable': round(totalRent * (1+GST) + prev_balance + latefee - discount),
		'inv_status': 'Generated',
		'meter_count': ','.join(map(str, meterCounts)),
		'rates': ','.join(map(str, rates)),
		'discount' : discount
	}
	if not appreciationCheck:
		return doc

	# Appreciation check
	# This function doebles as appreciation checker. Though this is not recommened as per
	# coding guidelines, sice the logic is same, we compromize a bit here
	# Adds { appreciatedBatches, origRates, apprRates}
	if prevInv is None:
		return None		# No appreciation if 1st invoice
	prevRates = [float(x) for x in prevInv['rates'].split(',')]
	apprBatches = [(pr != rates[indx]) for indx, pr in enumerate(prevRates)] # T or F in ordinal position indicates appreciated or not
	if True not in apprBatches:
		return None

	prevRates = [r for r in prevInv['rates'].split(',')]
	for indx, c in enumerate(contract):
		[stY, stM, stD] = [int(x) for x in c['start_date'].split('-')]
		mdiff = (invYear - stY)*12 + (invMonth - stM)			# Difference in months
		if mdiff == 0:		# Started this month. Could be prorated
			prevRates[indx] = rates[indx]
		elif mdiff in [1,2]:  # 2nd month. Last month could be partialTake from contract
			prevRates[indx] = c['orig_rent']

		doc |= {
		'appreciatedBatches' : apprBatches,
		'origRates' : [str(c['orig_rent']) for c in contract],
		'apprRates' : [str(c['appr_rate']) for c in contract],
		'prevRates' : prevRates
	}
	return doc

# Converts n to indian style number (1,23,456.89)
def indiaAmount(n):
	if type(n) is str:
		n = float(n)
	return locale.format_string("%.2f", n, grouping=True)

# Create Invoice from template and inv doctype
def CreateInvoiceReport (inv, contract, templateFile):

	propName = inv['property_name']
	prop = frappe.get_doc('RentalCustomers', propName)['response']
	invMonth = datetime.strptime(inv['inv_date'], "%Y-%m-%d")
	nextMonth = invMonth + dateutil.relativedelta.relativedelta(months=1)
	lastMonth = invMonth - dateutil.relativedelta.relativedelta(months=1)
	with open (templateFile) as ft:
		txt = ft.read()
	prevInv = fetchInvoice(propName, lastMonth.strftime('%Y-%m-01'))
	mcount = [m for m in inv['meter_count'].split(',')]
	rates = [r for r in inv['rates'].split(',')]
	planLine = typeLine = metersLine = ratesLine = rentsLine = ''
	sepmark = '\\line ' if templateFile.endswith('.rtf') else '<br>'
	for indx in range(len(mcount)):
		rent = int(mcount[indx]) * float(rates[indx])
		sep = sepmark if indx > 0 else ''
		metersLine += sep + mcount[indx]
		ratesLine += sep + rates[indx]
		rentsLine += sep + "%.2f" % rent
		planLine += sep + None2Blank(contract[indx]['plantype'])
		typeLine += sep + None2Blank(contract[indx]['water_type'])

	addr = prop['address'].replace('\n', '\\line ')
	gstin = None2Blank(prop.get('gstin_number',''))
	if gstin != '' :
		addr += '\\line GSTIN: ' + gstin
	# Replacement list
	repl = {
		'propname' : propName,
		'address' : addr,
		'phone' : prop.get('phone', '') ,
		'email' : prop.get('email', '') ,
		'gstin' : prop.get('gstin_number', '') ,
		'invnumber' : inv['inv_number'],
		'invdate': nextMonth.strftime("%d-%m-%Y"),
		'billmonth': invMonth.strftime("%b %Y"),
		'prev': indiaAmount(inv['prev_balance']),
		'currcharge': indiaAmount(inv['monthscharge'] + inv['sgst'] + inv['cgst']),
		'latefee':  indiaAmount(inv['late_fee']),
		'duedate': nextMonth.replace(day=15).strftime("%d-%m-%Y"),
		'total':  indiaAmount(inv['total_payable']),
		'sgst':  indiaAmount(inv['sgst']),
		'cgst': indiaAmount(inv['cgst']),
		'plan': planLine,
		'type': typeLine,
		'units': metersLine,
		'rate': ratesLine,
		'amount': rentsLine,
		'prevcharge': indiaAmount(prevInv['total_payable']) if prevInv else '0.0',
		'prevpayment': indiaAmount(float(prevInv['amt_rcvd'])+ float(prevInv['tds'])) if prevInv else '0.0',
	}
	for key in repl:
		txt = txt.replace('XX' + key + 'YY', repl[key] if repl[key] is not None else '')

	return txt

# Create invoice for the month for all properties
def generateAllInvoices(invDate):
	proplist = frappe.get_list('RentalCustomers', fields=['property_name'], limit_page_length=10000)['response']
	fields = ['property_name', 'inv_number', 'monthscharge', 'prev_balance', 'sgst', 'cgst', 'discount',
			  'late_fee', 'total_payable', 'inv_status', 'meter_count', 'rates']
	for prop in proplist:
		propName = prop['property_name']
		inv = generateInvoice(propName, invDate)
		if type(inv) is str:
			print (inv, file=sys.stderr)
			continue
		print (inv['inv_number'])
		insertDoc(inv)

def regenerateInvoice(invNumber):
	inv = fetchInvoice(invNumber=invNumber)
	invDoc = generateInvoice(inv['property_name'], inv['inv_date'], discount=inv['discount'])
	if inv:
		invDoc['inv_number'] = inv['inv_number']
		invDoc['name'] = inv['inv_number']
		return frappe.update(invDoc)
	else:
		return insertDoc(invDoc)

# Arg: list of invoice numbers, or None for all lasst month
def makePdfInvoice(invNumbers = None):
	if invNumbers is None:	# Get all invoice list for current month
		# Get invoice list for last month
		invMonth = (datetime.now() - dateutil.relativedelta.relativedelta(months=1)).strftime("%Y-%m-01")
		invList = frappe.get_list('RentalInvoices', filters={'inv_date': invMonth })['response']
	else:	# Get invoices for given invNumbers
		invList = frappe.get_list('RentalInvoices',
						filters={'inv_number': ('in', invNumbers) })['response']

	for inv in invList:
		propName = inv['property_name']
		contract = fetchContract(propName)
		rtf = CreateInvoiceReport(inv, contract, rtfTemplate)
		invN = inv['inv_number'].replace('/', '-')
		rtfFile = '/tmp/' + invN + '.rtf'
		pdfFile = rtfFile.replace('.rtf', '.pdf')

		# Write RTF to tmp file
		with open(rtfFile, 'w') as fo:
			print(rtf, file=fo)

		# Convert to PDF
		os.system('soffice --headless --convert-to pdf:"writer_pdf_Export:SelectPdfVersion=1" %s --outdir /tmp/' % rtfFile)
		uploadToS3(rtfFile.replace('.rtf', '.pdf'),"invoicessmarterhomes") # Upload to S3
		os.remove(rtfFile)	# Delete temp rtf file after conversion
		os.remove(pdfFile)
		print (propName)	# Debug

# Send mail to mailing list
def approveInvoice(invNumbers):
	for inv in invNumbers:
		inv = fetchInvoice(invNumber=inv)

# Send email to properties with pending payment
def PendingPaymentMail():
	thisMonth = datetime.now().replace(day=1)			# 1st of this month
	invs = frappe.get_list('RentalInvoices', 			# All invoices for this month
			filters={'inv_date': thisMonth.strftime("%Y-%m-%d")},
			fields=['property_name','total_payable', 'amt_rcvd', 'tds'])['response']
	tolerance = 5	# Emails will not be sent if outstanding is < Rs 5
	# with open('PendingFeeTemplate.html') as templ:
	# 	template = templ.read()

	template = "Email text"
	for inv in invs:
		pending = float(inv['total_payable']) - float(inv['amt_rcvd']) - float(inv['tds'])
		if pending > tolerance:
			# Create text
			dueDate = thisMonth.strftime("%b 21, %Y")
			mailText = template.replace('{{propname}}', inv['property_name']) \
							.replace('{{amount}}', indiaAmount(pending))	\
							.replace('{{duedate}}', dueDate)
			email = frappe.get_doc('RentalCustomers',  inv['property_name'],
								   fields=['email'])['response']['email']

			print (inv['property_name'],indiaAmount(pending),email , sep=',')

# Send appreciation mails. apprMonth: YYYY-MM-DD
def AppreciationMail(apprMonth):
	proplist = frappe.get_list('RentalCustomers', fields=['property_name','email','email_cc'], limit_page_length=10000)['response']
	fields = ['property_name', 'inv_number', 'monthscharge', 'prev_balance', 'sgst', 'cgst', 'discount',
			  'late_fee', 'total_payable', 'inv_status', 'meter_count', 'rates']

	with open('AppreciationTemplate.html') as templ:
		template = templ.read()

	mailer = sendemail.sendMail()
	# Extract ROW template
	stMarker, endMarker = '{{ROW}}', '{{ENDROW}}'
	stPos = template.find(stMarker)	# position of markers
	endPos = template.find(endMarker)
	rowTemplate = template[stPos + len(stMarker) : endPos]
	for prop in proplist:
		propName = prop['property_name']
		appr = generateInvoice(propName, apprMonth, appreciationCheck=True)
		if appr is None or type(appr) is str:
			continue

		# Create mail text
		rows = ''
		# Do row replacements first, as it depends on positions
		for indx, appreciated in enumerate(appr['appreciatedBatches']):
			mcount = appr['meter_count'].split(',')[indx]
			newRate = appr['rates'].split(',')[indx]
			prevRate = appr['prevRates'][indx]
			cRent = int(mcount) * float(newRate)
			totalRent = cRent * 1.18
			rows += rowTemplate \
				.replace('{{nmeters}}', mcount ) \
				.replace('{{orate}}', appr['origRates'][indx] ) \
				.replace('{{apprrate}}',appr['apprRates'][indx]+'%' if appreciated else '') \
				.replace('{{currate}}', str(prevRate) ) \
				.replace('{{newrate}}', newRate if appreciated else 'NA') \
				.replace('{{rent}}', indiaAmount(cRent)) \
				.replace('{{plusgst}}', indiaAmount(totalRent))

		# Do global replacements
		mailText = template[:stPos] + rows + template[endPos+len(endMarker):]
		mailText = mailText.replace('{{propname}}', propName) \
						.replace('{{date}}', datetime.now().strftime("%d %b %Y"))

		ExtCCs = prop['email_cc'].replace('\n', ' ').replace(',', ' ')
		IntCcs = "csm@smarterhomes.com accounts@smarterhomes.com lalitha.g@smarterhomes.com nithyakiran.n@smarterhomes.com"
		ccList = (ExtCCs + (' ' if ExtCCs != '' else '') + IntCcs).split(' ')
		# with open('/tmp/appr/' + propName + '.html', 'w') as mailf:
		# 	print (propName)
		# 	mailf.write(mailText)
		[aY, aM, aD] = apprMonth.split('-')
		toAddr = prop['email']
		#toAddr = 'badusha.ks@smarterhomes.com'
		bccList = ['badusha.ks@smarterhomes.com', 'richard.nickson@smarterhomes.com'] 
		#ccList = ['badushaks@kathariwater.co.in', 'ksbadusha@gmail.com']
		#bccList = ['ksbmailers@gmail.com', 'ksbmailers@gmail.com', 'ksbadusha@gmail.com']
		subj = "Intimation regarding service rate appreciation from the month of %s %s - %s" % (monthNames[int(aM)-1], aY,propName )
		print ("Sending intimation mail for " + propName)
		mailer.send([toAddr], subj, mailText, ccList, bccList)




def httpAPI(req):
	res = { 'ok': False, 'reason': 'Unknown request' }
	try:
		if req['request'] == 'regenerateInvoice':
			resp = regenerateInvoice(req['property_name'], req['date'])
		elif req['request'] == 'approve':
			resp = approveInvoice(req['inv_number'])

		if resp['ok'] == True :
			return {'status': 'ok'}
		else:
			err = resp['reason']
			if 'response' in resp:
				err += ' ' + resp['response']
			return {'status': 'fail' , 'reason':err}

	except Exception as e:
		return {'status': 'fail', 'reason': str(e)}

if __name__ == '__main__':
	initInvoicer()

	# generateinvoice INV_NUMBER (to regenerate)
	# OR generateinvoice yyyy-mm-dd propertyName|all
	res = None
	if sys.argv[1] == 'generateinvoice':
		if len(sys.argv) == 3 and sys.argv[2].startswith('KA'):		# Invoice number
			res = regenerateInvoice(sys.argv[2])
		elif len(sys.argv) == 4 and sys.argv[2].startswith('20'):	# Date and property name  or 'all'
			if sys.argv[3] == 'all':
				generateAllInvoices(sys.argv[2])	# Date, 'all'
			else:	# Assume date and property name
				res = generateInvoice(sys.argv[3], sys.argv[2])
		print(res)

	# pdf, [list of invNumber]
	elif sys.argv[1] == "pdf":
		makePdfInvoice([sys.argv[2]] if len(sys.argv) > 2 else None)
	elif sys.argv[1] == "emailpending":
		PendingPaymentMail()
	elif sys.argv[1] == "appreciationmail":
		AppreciationMail(sys.argv[2])


	# elif sys.argv[1] == "approve":		# Arg: list of invoice numbers





