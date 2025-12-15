
# 1 Code retrieval

```sh
curl -X POST https://api.imsha.by/api/passwordless/code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_INTERNAL_TOKEN_HERE" \
  -d '{
    "email": "example@mail.com"
  }'

```
# Response: 200 OK
# {
#   "code": "L6G4LRiXdxwtVTX27dM4iVbHfbA9Br8GYwZ7QqclQHA"
# }



# 2. Exchange code for JWT token

```sh
curl -X POST http://localhost:9091/api/passwordless/login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "L6G4LRiXdxwtVTX27dM4iVbHfbA9Br8GYwZ7QqclQHA"
  }'

```

# Response: 200 OK
# {
#   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzaXRlIjoiaW1zaGEuYnkifQ.HtVmRcsfYvY4u10zHVH8raeA__C7A8pIdls6mhfUk2c"
# }






