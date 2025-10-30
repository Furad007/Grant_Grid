-- Drop existing tables if they exist (optional)
DROP TABLE IF EXISTS pi, co_pi, personnel;

-- Create PI table
CREATE TABLE pi (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Create Co-PI table
CREATE TABLE co_pi (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Create Other Personnel table
CREATE TABLE personnel (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Insert sample data
INSERT INTO pi (name) VALUES
('Hasan Jamil'),
('Albus Dumbledore'),
('Sirius Black'),
('Severus Snape'),
('Minerva McGonagal');

INSERT INTO co_pi (name) VALUES
('Sneha Bajracharya'),
('Syed Masum'),
('Harry Potter'),
('Hermione Granger'),
('Ronald Weasly');

INSERT INTO personnel (name) VALUES
('Rubeus Hagrid'),
('Remus Lupin'),
('Gilderoy Lockhart');
