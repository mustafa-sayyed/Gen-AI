const inputBox = document.querySelector(".input-container input");
const addBtn = document.querySelector(".input-container button");
const todoList = document.querySelector("#todo-list");
const clearAllBtn = document.querySelector(".footer button");
const pendingTasksCount = document.querySelector("#pending-tasks");
const dateElement = document.getElementById("date");
const options = { weekday: "long", month: "long", day: "numeric" };
const today = new Date();
dateElement.innerHTML = today.toLocaleDateString("en-US", options);
inputBox.onkeyup = () => {
    let userData = inputBox.value;
    if (userData.trim() != 0) {
        addBtn.classList.add("active");
    } else {
        addBtn.classList.remove("active");
    }
};
const showTasks = () => {
    let getLocalStorage = localStorage.getItem("New Todo");
    let listArr = getLocalStorage == null ? [] : JSON.parse(getLocalStorage);
    pendingTasksCount.textContent = `You have ${listArr.filter(t => t.status === "pending").length} pending tasks`;
    let newLiTag = "";
    listArr.forEach((element, index) => {
        newLiTag += `<li><span class="task-text ${element.status === "completed" ? "completed" : ""}">${element.text}</span><div class="actions"><i class="fas fa-check check-btn" onclick="toggleTask(${index})"></i><i class="fas fa-trash delete-btn" onclick="deleteTask(${index})"></i></div></li>`;
    });
    todoList.innerHTML = newLiTag;
};
addBtn.onclick = () => {
    let userData = inputBox.value;
    if (userData.trim() == 0) return;
    let getLocalStorage = localStorage.getItem("New Todo");
    let listArr = getLocalStorage == null ? [] : JSON.parse(getLocalStorage);
    listArr.push({ text: userData, status: "pending" });
    localStorage.setItem("New Todo", JSON.stringify(listArr));
    showTasks();
    inputBox.value = "";
};
window.deleteTask = (index) => {
    let getLocalStorage = localStorage.getItem("New Todo");
    let listArr = JSON.parse(getLocalStorage);
    listArr.splice(index, 1);
    localStorage.setItem("New Todo", JSON.stringify(listArr));
    showTasks();
};
window.toggleTask = (index) => {
    let getLocalStorage = localStorage.getItem("New Todo");
    let listArr = JSON.parse(getLocalStorage);
    listArr[index].status = listArr[index].status === "pending" ? "completed" : "pending";
    localStorage.setItem("New Todo", JSON.stringify(listArr));
    showTasks();
};
clearAllBtn.onclick = () => {
    localStorage.setItem("New Todo", JSON.stringify([]));
    showTasks();
};
showTasks();