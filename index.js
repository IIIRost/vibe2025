const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
};

async function addListItem(text) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO items (text) VALUES (?)';
        await connection.execute(query, [text]);
        await connection.end();
    } catch (error) {
        console.error('Error adding list item:', error);
        throw error;
    }
}

async function updateListItem(id, text) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'UPDATE items SET text = ? WHERE id = ?';
        await connection.execute(query, [text, id]);
        await connection.end();
    } catch (error) {
        console.error('Error updating list item:', error);
        throw error;
    }
}

async function deleteListItem(id) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'DELETE FROM items WHERE id = ?';
        await connection.execute(query, [id]);
        await connection.end();
    } catch (error) {
        console.error('Error deleting list item:', error);
        throw error;
    }
}

async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items ORDER BY id';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td class="item-text" ondblclick="startEditing(${item.id})">
                <span id="text-${item.id}">${item.text}</span>
                <input type="text" id="edit-${item.id}" value="${item.text}" 
                       style="display:none" onblur="finishEditing(${item.id})"
                       onkeypress="handleEditKeyPress(event, ${item.id})">
            </td>
            <td>
                <button class="delete-btn" onclick="removeItem(${item.id})">×</button>
            </td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/add') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { text } = JSON.parse(body);
                    await addListItem(text);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error(error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Failed to add item' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method not allowed');
        }
    } else if (parsedUrl.pathname === '/update') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { id, text } = JSON.parse(body);
                    await updateListItem(id, text);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error(error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Failed to update item' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method not allowed');
        }
    } else if (parsedUrl.pathname === '/delete') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { id } = JSON.parse(body);
                    await deleteListItem(id);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error(error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Failed to delete item' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method not allowed');
        }
    } else if (parsedUrl.pathname === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
