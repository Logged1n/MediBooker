# 🏥 MediBooker

MediBooker is a web application designed to streamline the process of booking medical rooms for doctors and healthcare staff.  
The system ensures efficient scheduling, prevents conflicts, and provides administrators with full control over room management.

---

## 🚀 Overview

Medical facilities often struggle with organizing room availability, avoiding scheduling conflicts, and maintaining clear reservation records.

MediBooker solves this problem by providing:

- 📅 An intuitive booking system
- 🏥 Centralized room management
- 🔒 Conflict prevention (no double bookings)
- 👩‍⚕️ Role-based access control
- 📊 Clear reservation overview

---

## ✨ Features

### 👨‍⚕️ For Doctors
- View available medical rooms
- Book a room for a selected time slot
- Cancel or modify reservations
- View personal booking history

### 🛠 For Administrators
- Add, edit, and remove medical rooms
- Manage room availability
- View all reservations
- Prevent scheduling conflicts automatically

---

## 🏗 Architecture

MediBooker is built using a layered architecture to ensure maintainability and scalability.

- **Frontend** – modern web interface
- **Backend API** – RESTful service handling business logic
- **Database** – relational database for storing rooms, users, and reservations
- **Authentication & Authorization** – role-based access control

The system follows clean architectural principles and separation of concerns.

---

## 🔐 Key Business Rules

- A room cannot be double-booked for the same time slot.
- Only authenticated users can create reservations.
- Only administrators can manage rooms.
- Reservations must have a valid start and end time.

---

## 📦 Tech Stack

- Frontend: React
- Backend: ASP.NET Core Web API
- Database: PostgreSQL
- Authentication: JWT-based authentication
- Testing: Unit tests + End-to-End tests

---

## 🧪 Testing

The application includes:

- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for booking scenarios

---

## 📈 Future Improvements

- Calendar view integration
- Email notifications for reservations
- Recurring bookings
- Reporting and analytics dashboard
- Mobile-friendly version

---

## 🎯 Project Goals

The main goal of MediBooker is to demonstrate:

- Scalable backend design
- Secure authentication and authorization
- Proper separation of concerns
- Testing strategy implementation

---

## 📄 License

This project is created for educational and demonstration purposes.
