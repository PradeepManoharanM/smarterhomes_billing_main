import datetime
import json, sys
import time
import traceback

from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import json
import InvoiceSvc

USE_HTTPS = False
class requestHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            req = json.loads(body)
            print("Received JSON:", req)
            response = InvoiceSvc.httpAPI(req)

        except Exception as e:
            print (e)
            traceback.print_exc()
            response = {'status': 'fail', 'reason': str(e)}

        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")  # REQUIRED for CORS
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        resp = json.dumps(response).encode('utf-8')
        print ("Sent: " + str(resp) )
        self.wfile.write(resp)
        return


class ThreadingSimpleServer(ThreadingMixIn, HTTPServer):
    pass

if __name__ == '__main__':

    port = 8881
    InvoiceSvc.initInvoicer()
    httpd = ThreadingSimpleServer(('0.0.0.0', port), requestHandler)
    if USE_HTTPS:
        import ssl
        httpd.socket = ssl.wrap_socket(httpd.socket, keyfile='./key.pem', certfile='./cert.pem', server_side=True)
    print("Server running on port %d" % port )
    httpd.serve_forever()
