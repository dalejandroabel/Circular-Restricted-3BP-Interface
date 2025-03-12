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

