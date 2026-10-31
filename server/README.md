# RuneStone Bank (Backend)

  A simulated banking infrastructure built with Spring Boot and MariaDB.

This is the backend service for RuneStone Bank, handling account management, transaction processing, and statement generation. It is designed to demonstrate ACID compliance, secure data handling, and proper financial service architecture.

# Tech Stack

   -  Core: Java 21

  - Framework: Spring Boot 3

  - Database: MariaDB

  - Security: Spring Security & JWT (Stateless Authentication)

  - Reporting: iText (PDF Generation) & JavaMailSender

 ## Key Features

  - User Management: Account creation and profile updates.

  - Transaction Engine:

  - Credit/Debit: Atomic transactions ensuring balance integrity.

  - Transfers: Intra-bank transfers with validation.

  - Enquiries: Real-time balance checks and account name resolution (nameEnquiry).

   - Bank Statements: Auto-generated PDF statements delivered via email.
