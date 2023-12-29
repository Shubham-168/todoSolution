const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const format = require('date-fns/format')
const isValid = require('date-fns/isValid')

const databasePath = path.join(__dirname, 'todoApplication.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndStatusProperties = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndPriorityProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  )
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasCategoryProperty = requestQuery => {
  return requestQuery.category !== undefined
}

const hasDateProperty = requestQuery => {
  return requestQuery.date !== undefined
}

const convertDbAndServerForTodo = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  }
}

const isValidStatus = arg => {
  if (arg === 'TO DO' || arg === 'IN PROGRESS' || arg === 'DONE') {
    return true
  } else {
    return false
  }
}

const isValidPriority = arg => {
  if (arg === 'HIGH' || arg === 'MEDIUM' || arg === 'LOW') {
    return true
  } else {
    return false
  }
}
const isValidCategory = arg => {
  if (arg === 'WORK' || arg === 'HOME' || arg === 'LEARNING') {
    return true
  } else {
    return false
  }
}

app.get('/todos/', async (request, response) => {
  let data = null
  let getTodosQuery = ''
  const {search_q = '', priority, status, category} = request.query

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`
      break
    case hasPriorityProperty(request.query):
      if (isValidPriority(priority)) {
        getTodosQuery = `
        SELECT
          *
        FROM
          todo 
        WHERE
          todo LIKE '%${search_q}%'
          AND priority = '${priority}';`
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case hasCategoryProperty(request.query):
      if (isValidCategory(category)) {
        getTodosQuery = `
        SELECT
          *
        FROM
          todo 
        WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    case hasStatusProperty(request.query):
      if (isValidStatus(status)) {
        getTodosQuery = `
        SELECT
          *
        FROM
          todo 
        WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break
    case hasCategoryAndStatusProperties:
      getTodosQuery = `
        SELECT
          *
        FROM
          todo 
        WHERE
          todo LIKE '%${search_q}%'
          AND category = '${category}'
          AND status = '${status}';`
      break
    case hasCategoryAndPriorityProperties:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND  priority = '${priority}'
        AND category = '${category}';`
      break
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`
  }

  data = await database.all(getTodosQuery)
  response.send(data.map(eachTodo => convertDbAndServerForTodo(eachTodo)))
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`
  const todo = await database.get(getTodoQuery)
  response.send(convertDbAndServerForTodo(todo))
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query

  if (date === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    const isDateValid = isValid(new Date(date))
    if (isDateValid) {
      const formattedDate = format(new Date(date), 'yyyy-MM-dd')
      const getDateQuery = `
        SELECT * 
        FROM todo
        WHERE 
          due_date = '${formattedDate}';
        `
      const data = await database.all(getDateQuery)
      response.send(data.map(eachData => convertDbAndServerForTodo(eachData)))
    } else {
      response.status(400)
      response.send('Invalid Due Date')
    }
  }
})

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body

  const requestBody = request.body
  switch (true) {
    case requestBody.status !== undefined:
      if (isValidStatus(requestBody.status) === false) {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break
    case requestBody.priority !== undefined:
      if (isValidPriority(requestBody.priority) === false) {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case requestBody.category !== undefined:
      if (isValidCategory(requestBody.category) === false) {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    case requestBody.dueDate !== undefined:
      const isDateValid = isValid(new Date(requestBody.dueDate))
      if (isDateValid === false) {
        response.status(400)
        response.send('Invalid Due Date')
      }
      break
  }

  const formattedDate = format(new Date(dueDate), 'yyyy-MM-dd')
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status, category, due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}', '${category}', '${formattedDate}'); `

  await database.run(postTodoQuery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let updateColumn = ''
  const requestBody = request.body
  switch (true) {
    case requestBody.status !== undefined:
      if (isValidStatus(requestBody.status) === true) {
        updateColumn = 'Status'
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break
    case requestBody.priority !== undefined:
      if (isValidPriority(requestBody.priority) === true) {
        updateColumn = 'Priority'
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case requestBody.todo !== undefined:
      updateColumn = 'Todo'
      break
    case requestBody.category !== undefined:
      if (isValidCategory(requestBody.category) === true) {
        updateColumn = 'Category'
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break
    case requestBody.dueDate !== undefined:
      const isDateValid = isValid(new Date(requestBody.dueDate))
      if (isDateValid) {
        updateColumn = 'Due Date'
      } else {
        response.status(400)
        response.send('Invalid Due Date')
      }
      break
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`
  const previousTodo = await database.get(previousTodoQuery)

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category ='${category}',
      due_date = '${dueDate}'
    WHERE
      id = ${todoId};`

  await database.run(updateTodoQuery)
  response.send(`${updateColumn} Updated`)
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`

  await database.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
