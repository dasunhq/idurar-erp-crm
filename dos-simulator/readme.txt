Installation:

On macOS (with Homebrew): brew install httpd

On Debian/Ubuntu: sudo apt-get update && sudo apt-get install apache2-utils

On Windows: You can get it by installing the Apache server or using a Linux subsystem (WSL).

-----------------------------------------------------------------------------------------------------------------
Usage : 
Run this command on terminal to Simulate DoS attack using ApacheBench

ab -n 1000 -c 100 http://localhost:<Port>
ab -n 1000 -c 100 http://localhost:8888/


-n 1000  - this is total requests to be send
-c 100 - this is the concurrency level , Apache Bench will try to have 100 requests active at the same time (simultaniously )

Apache bench will then run the test and give a detailed report including requests per second, time per request, and any failures.


-----------------------------------------------------------------------------------------------------------------------

ab -n 1000 -c 1 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZDM1ZmM2NzVlMDY2YzhlMTQyYTBkZSIsImlhdCI6MTc1ODY5NTIwNCwiZXhwIjoxNzU4NzgxNjA0fQ.DETK9lad-cEYMRXw9Ojn9E00EAd3bPmwS5ATGUbrx5k" http://localhost:8888/api/setting/list

ab -n 1000 -c 100 -H "Authorization: Bearer <Token>" http://localhost:8888/api/setting/list
