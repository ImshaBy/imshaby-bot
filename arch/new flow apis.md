
Email send example :
```sh
curl --location 'https://api.imsha.by/api/auth/request-code' \
--header 'x-api-key: ecfb0697-74fe-41fd-9033-c443522d3533' \
--header 'content-type: application/json' \
--data-raw '{
    "email": "andrei.m@gmail.com"
}'
```


Code verification examples:
```sh
curl --location 'https://api.imsha.by/api/auth/verify-code' \
--header 'x-api-key: ecfb0697-74fe-41fd-9033-c443522d3533' \
--header 'content-type: application/json' \
--data-raw '{
    "email": "andrei.m@gmail.com",
    "confirmationCode": "5180"
}'

```



