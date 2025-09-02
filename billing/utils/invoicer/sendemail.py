import sendgrid
from sendgrid.helpers.mail import ( Mail, Cc, To, From, Subject, 
                    Content, HtmlContent, Bcc, Personalization )
from bs4 import BeautifulSoup

SENDGRID_API_KEY='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'

class sendMail:
    def __init__(self):
        self. sendgridClient = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)

    def send(self, toList, subject, html, ccList=[], bccList=[]):
        htmlContent = HtmlContent(html)
        soup = BeautifulSoup(html, features='lxml')
        plain_text = soup.get_text()
        plainTextContent = Content("text/plain", plain_text)
        message = Mail(From('no-reply@wateron.cc'), [To(toAddr,toAddr) for toAddr in toList],
            Subject(subject), plainTextContent, htmlContent)
        personalization = Personalization()
        for addr in set(toList):        # Use set() to remove duplicates within list
            personalization.add_to(To(addr))
        for addr in set(ccList):
            if addr not in toList:      # Avoid duplicates
                personalization.add_cc(Cc(addr))
        for addr in set(bccList):
            if addr not in toList + ccList:      # Avoid duplicates
                personalization.add_bcc(Bcc(addr))

        message.add_personalization(personalization)

        print("Sending to " + str(toList))
        print("CCing to " + str(ccList))
        print("BCCing to " + str(bccList))
        response = self.sendgridClient.send(message)
        print(response.status_code)

    def send2(self, toList, subject, html, ccList=None, bccList=None):
        htmlContent = HtmlContent(html)
        soup = BeautifulSoup(html, features='lxml')
        plain_text = soup.get_text()
        plainTextContent = Content("text/plain", plain_text)
        message = Mail(From('no-reply@wateron.cc'), [To(toAddr,toAddr) for toAddr in toList],
            Subject(subject), plainTextContent, htmlContent)
        if ccList is not None:
            message.add_cc = [Cc(ccAddr,ccAddr) for ccAddr in ccList]
        if bccList is not None:
            message.add_bcc = [Bcc(ccAddr) for ccAddr in bccList]

        print("Sending to " + str(toList))
        print("CCing to " + str(ccList))
        response = self.sendgridClient.send(message)
        print(response.status_code)


# Test
def unitTest():

    sender = sendMail()
    toList = input("To list(space separated): ").split(' ')
    ccList = input("CC list(space separated): ").split(' ')
    subj = input("Subject: ")
    hfile = input("Html file: ")
    with open(hfile) as hf:
        html = hf.read()
    sender.send(toList, subj, html, ccList)

if __name__ == '__main__':
    unitTest()
