Copy-Item -LiteralPath ".\apps\api\.env.example" -Destination ".\apps\api\.env" -Force
Copy-Item -LiteralPath ".\apps\web\.env.example" -Destination ".\apps\web\.env" -Force
docker-compose up --build
