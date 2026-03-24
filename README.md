# Salinaka | E-commerce react app

Simple ecommerce react js app with local json-server backend.

### [Live demo](https://salinaka-ecommerce.web.app/)

![Salinaka screenshot](https://raw.githubusercontent.com/jgudo/ecommerce-react/master/static/screeny1.png)
![Salinaka screenshot](https://raw.githubusercontent.com/jgudo/ecommerce-react/master/static/screeny2.png)
![Salinaka screenshot](https://raw.githubusercontent.com/jgudo/ecommerce-react/master/static/screeny3.png)
![Salinaka screenshot](https://raw.githubusercontent.com/jgudo/ecommerce-react/master/static/screeny7.png)

## Run Locally

### 1. Install Dependencies

```sh
$ yarn install
```

### 2. Run json-server backend

```sh
$ yarn server
```

The API runs at `http://localhost:3001` and uses [db.json](db.json).

### 3. Run frontend development server

```sh
$ yarn dev
```

Optional: use a custom API base URL

```sh
VITE_API_BASE_URL=http://localhost:3001
```

Optional: configure real password reset emails (EmailJS)

```sh
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

Email template variables expected by the app:

- `to_email`
- `reset_code`
- `app_name`
- `expires_in_minutes`

---

## Build the project

```sh
$ yarn build
```

## Default admin account

- Email: `admin@salinaka.local`
- Password: `admin123`

You can edit users/products directly in [db.json](db.json).

## Features

- Admin CRUD operations
- json-server authentication (email/password + mock social login)
- Account creation and edit
