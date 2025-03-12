# CRTBP Database

## Server installation

- Clone:

```
git clone git@github.com-seap-udea:dalejandroabel/Circular-Restricted-3BP-Interface
```

- Install packages:

```
apt install nodejs npm
```

- Install database:

  - Download database (available in this repo folder []()):

    ```
    gdown 1Cya1yM_xaMg4Vp6gJq7IWTNSQ2dbVvSK
    ```

  - Install `MySQL` and set up root:

    ```
    apt install mysql-server
    mysql -u root
    > ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'xyz';
    mysql -u root -p
    create database crtbp;
    ```
    

  - Undump database:

    ```
    mysql -h localhost -u root -p crtbp < crtbp_db_backup.sql 
    ```

- Run server: go to `src` directory and run:

  ```
  npm run dev
  ```

  This will create a server in `localhost:5173`.

## Installation in MacOS

- Install packages:

   ```sh
   brew install node npm vite
   ```

- Create an account at https://www.mysql.com.

- Download the MySQL server from: https://dev.mysql.com/downloads/mysql/.

- Install the server. When installing it will create a root user and
you will be asked to set a password. Please recall the password or
save it in a safe place.

- Once installed locate the mysql binary. Normally it is installed in a directory such as `/usr/local/mysql-8.0.32-macos13-arm64/`. Check the binary of mysql is running properly using:

   ```sh
   /usr/local/mysql-8.0.32-macos13-arm64/bin/mysql
   ```
   If it *works*, you will get an error like:

   ```
   ERROR 1045 (28000): Access denied for user...
   ```

   Now you can test that you have access to the root user:

   ```sh
   /usr/local/mysql-8.0.32-macos13-arm64/bin/mysql -u root -p 
   ```
   use the same password you set up during installation.

- Set an alias for the mysql command. For this, open the `$HOME/.bashrc`:

   ```
   alias mysql="/usr/local/mysql-8.0.32-macos13-arm64/bin/mysql"
   ```

   Open a new terminal and run:
   ```
   mysql
   ```
   if it works, you will see an error similar to that in 4.

Now you are ready to work with `MySQL`.
