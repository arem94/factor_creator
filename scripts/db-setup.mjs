/**
 * ساخت پایگاه داده و جداول لازم برای فاکتورساز.
 * اجرا:  node --env-file=.env.local scripts/db-setup.mjs
 */
import sql from "mssql";

const server = process.env.DB_SERVER ?? "localhost";
const port = Number(process.env.DB_PORT ?? 1433);
const database = process.env.DB_NAME ?? "MrKem_Factors";
const user = process.env.DB_USER ?? "sa";
const password = process.env.DB_PASSWORD ?? "";

const baseConfig = {
  server,
  port,
  user,
  password,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
    enableArithAbort: true,
  },
  requestTimeout: 60000,
  connectionTimeout: 30000,
};

function log(message) {
  console.log(message);
}

async function main() {
  log(`→ اتصال به ${server}:${port} ...`);

  const master = await new sql.ConnectionPool({ ...baseConfig, database: "master" }).connect();
  log("✓ اتصال برقرار شد");

  const exists = await master
    .request()
    .input("name", sql.NVarChar(128), database)
    .query("SELECT DB_ID(@name) AS id");

  if (!exists.recordset[0]?.id) {
    log(`→ ساخت پایگاه داده ${database} ...`);
    await master.request().query(`CREATE DATABASE [${database.replace(/]/g, "]]")}]`);
    log("✓ پایگاه داده ساخته شد");
  } else {
    log(`✓ پایگاه داده ${database} از قبل وجود دارد`);
  }
  await master.close();

  const pool = await new sql.ConnectionPool({ ...baseConfig, database }).connect();
  log("✓ اتصال به پایگاه داده انجام شد");

  const statements = [
    {
      name: "Users",
      sql: `
        IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.Users (
            Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
            FullName         NVARCHAR(150) NOT NULL,
            Mobile           VARCHAR(11)   NOT NULL,
            Username         NVARCHAR(64)  NOT NULL,
            PasswordHash     NVARCHAR(255) NOT NULL,
            MobileVerifiedAt DATETIME2(0)  NULL,
            CreatedAt        DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
            LastLoginAt      DATETIME2(0)  NULL,
            CONSTRAINT UQ_Users_Mobile   UNIQUE (Mobile),
            CONSTRAINT UQ_Users_Username UNIQUE (Username)
          );
        END`,
    },
    {
      name: "OtpCodes",
      sql: `
        IF OBJECT_ID(N'dbo.OtpCodes', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.OtpCodes (
            Id         BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OtpCodes PRIMARY KEY,
            Mobile     VARCHAR(11)  NOT NULL,
            CodeHash   CHAR(64)     NOT NULL,
            Purpose    VARCHAR(32)  NOT NULL,
            Payload    NVARCHAR(MAX) NULL,
            Attempts   INT          NOT NULL CONSTRAINT DF_OtpCodes_Attempts DEFAULT 0,
            ExpiresAt  DATETIME2(0) NOT NULL,
            ConsumedAt DATETIME2(0) NULL,
            CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_OtpCodes_CreatedAt DEFAULT SYSUTCDATETIME()
          );
          CREATE INDEX IX_OtpCodes_Mobile ON dbo.OtpCodes (Mobile, CreatedAt DESC);
        END`,
    },
    {
      name: "UserProfiles",
      sql: `
        IF OBJECT_ID(N'dbo.UserProfiles', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.UserProfiles (
            UserId          INT NOT NULL CONSTRAINT PK_UserProfiles PRIMARY KEY
                            CONSTRAINT FK_UserProfiles_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE,
            SellerName      NVARCHAR(200) NULL,
            NationalId      NVARCHAR(50)  NULL,
            Phone           NVARCHAR(50)  NULL,
            Email           NVARCHAR(150) NULL,
            Website         NVARCHAR(150) NULL,
            Address         NVARCHAR(500) NULL,
            Logo            NVARCHAR(MAX) NULL,
            FooterNote      NVARCHAR(1000) NULL,
            Terms           NVARCHAR(500)  NULL,
            SignatureSeller NVARCHAR(100)  NULL,
            SignatureBuyer  NVARCHAR(100)  NULL,
            Currency        NVARCHAR(10)   NULL,
            TaxEnabled      BIT            NULL,
            TaxRate         DECIMAL(5,2)   NULL,
            UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_UserProfiles_UpdatedAt DEFAULT SYSUTCDATETIME()
          );
        END`,
    },
    {
      name: "Invoices",
      sql: `
        IF OBJECT_ID(N'dbo.Invoices', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.Invoices (
            Id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Invoices PRIMARY KEY,
            UserId     INT NOT NULL CONSTRAINT FK_Invoices_Users REFERENCES dbo.Users(Id),
            Number     NVARCHAR(64)  NOT NULL,
            IssueDate  DATE          NOT NULL,
            DueDate    DATE          NULL,
            BuyerName  NVARCHAR(200) NULL,
            Currency   NVARCHAR(10)  NOT NULL,
            Subtotal   DECIMAL(18,0) NOT NULL,
            Discount   DECIMAL(18,0) NOT NULL,
            Tax        DECIMAL(18,0) NOT NULL,
            Total      DECIMAL(18,0) NOT NULL,
            ItemCount  INT           NOT NULL,
            DataJson   NVARCHAR(MAX) NOT NULL,
            CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Invoices_CreatedAt DEFAULT SYSUTCDATETIME(),
            UpdatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Invoices_UpdatedAt DEFAULT SYSUTCDATETIME()
          );
          CREATE INDEX IX_Invoices_UserId_CreatedAt ON dbo.Invoices (UserId, CreatedAt DESC);
          CREATE INDEX IX_Invoices_Number ON dbo.Invoices (UserId, Number);
        END`,
    },
  ];

  for (const statement of statements) {
    await pool.request().batch(statement.sql);
    log(`✓ جدول ${statement.name} آماده است`);
  }

  const tables = await pool.request().query(`
    SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo') ORDER BY name`);
  log("جداول: " + tables.recordset.map((row) => row.name).join(", "));

  await pool.close();
  log("✓ همه‌چیز آماده است");
}

main().catch((error) => {
  console.error("✗ خطا:", error.message);
  if (error.number) console.error("شماره خطای SQL:", error.number);
  process.exitCode = 1;
});
