# Vegan & Cruelty-Free Product Checker

A simple web app that helps users quickly determine if a product is **vegan** and/or **cruelty-free**. Just search for a product, and get instant information on its ethical status!  

## Features

- Search for products by name  
- Check if a product is vegan  
- Check if a product is cruelty-free  
- Ad free, forever and always

## Boring Stuff

To import data locally using the seed file:
```
wrangler d1 execute cruelty_check --local --file .\seed.sql
```
And to run the local development server:
```
wrangler pages dev . --d1=DATABASE=cruelty_check
```

## Support Me ☕

If you like this project and want to support my work, you can buy me a coffee here:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/M4M41KS233)
