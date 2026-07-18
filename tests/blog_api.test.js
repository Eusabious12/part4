const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const Blog = require('../models/blog')

const api = supertest(app)

const initialBlogs = [
  { title: 'React patterns', author: 'Michael Chan', url: 'https://reactpatterns.com/', likes: 7 },
  { title: 'Canonical string reduction', author: 'Edsger W. Dijkstra', url: 'http://example.com/canonical', likes: 12 },
]

beforeEach(async () => {
  await Blog.deleteMany({})
  await Blog.insertMany(initialBlogs)
})

test('blogs are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('all blogs are returned', async () => {
  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, initialBlogs.length)
})

test('the unique identifier is named id', async () => {
  const response = await api.get('/api/blogs')
  const blog = response.body[0]
  assert.ok(blog.id)
  assert.strictEqual(blog._id, undefined)
})

test('a valid blog can be added', async () => {
  const newBlog = {
    title: 'Test Driven Development',
    author: 'Kent Beck',
    url: 'http://example.com/tdd',
    likes: 5,
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, initialBlogs.length + 1)

  const titles = response.body.map(b => b.title)
  assert.ok(titles.includes('Test Driven Development'))
})

test('likes defaults to 0 when missing', async () => {
  const newBlog = {
    title: 'A blog with no likes field',
    author: 'Nobody',
    url: 'http://example.com/nolikes',
  }

  const response = await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)

  assert.strictEqual(response.body.likes, 0)
})

test('blog without title is not added', async () => {
  const newBlog = {
    author: 'Nobody',
    url: 'http://example.com/notitle',
    likes: 3,
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400)
})

test('blog without url is not added', async () => {
  const newBlog = {
    title: 'A blog with no url',
    author: 'Nobody',
    likes: 3,
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400)
})

test('a blog can be deleted', async () => {
  const blogsAtStart = await api.get('/api/blogs')
  const blogToDelete = blogsAtStart.body[0]

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .expect(204)

  const blogsAtEnd = await api.get('/api/blogs')
  assert.strictEqual(blogsAtEnd.body.length, initialBlogs.length - 1)

  const ids = blogsAtEnd.body.map(b => b.id)
  assert.ok(!ids.includes(blogToDelete.id))
})

test('the likes of a blog can be updated', async () => {
  const blogsAtStart = await api.get('/api/blogs')
  const blogToUpdate = blogsAtStart.body[0]

  const updated = await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send({ likes: blogToUpdate.likes + 1 })
    .expect(200)

  assert.strictEqual(updated.body.likes, blogToUpdate.likes + 1)
})

after(async () => {
  await mongoose.connection.close()
})
