import React from 'react';
import $ from 'jquery';
var socket = io.connect('/io/deliverables');

class Form extends React.Component {
  constructor(props) {
    super(props);
    this.state = {id: props.projectid, task: null, owner: null, points: null, status: 'current'}
  }

  componentDidMount() {
    // Tell other clients a change occured
    socket.emit('room', this.props.room);
  }

  handleSubmit(event) {
    event.preventDefault();
    if (this.state.task && this.state.owner && this.state.points && this.state.status) {
      axios.post('/api/deliverables', {
        projectID: this.state.id,
        task: this.state.task,
        owner: this.state.owner,
        points: this.state.points,
        status: this.state.status
      }).then(function(response) {
        socket.emit('change', 'post');
      });
      this.setState({task: null, owner: null, points: null, status: 'current'});
      document.getElementById('deliverableForm').reset();
      $('#deliverableForm').css('border', 'none');
    } else {
      $('#deliverableForm').css('border', '2px solid red');
    }
  }

  render() {
    return (
      <form id="deliverableForm" className="form" onSubmit={this.handleSubmit.bind(this)}>
        <div className="col-12">
          <label className="sr-only" htmlFor="deliverable-input-task">Task</label>
          <input type="text" className="form-control" id="deliverable-input-task" placeholder="Task"
            onChange={(event) => this.setState({task: event.target.value})} />
        </div>
        <div className="col-12">
          <label className="sr-only" htmlFor="deliverable-input-assignment">Assigned To</label>
          <input type="text" className="form-control" id="deliverable-input-assignment" placeholder="Team Member"
            onChange={(event) => this.setState({owner: event.target.value})} />
        </div>
        <div className="col-12">
          <label className="sr-only" htmlFor="deliverable-input-fibbonaci">Task Complexity</label>
          <select className="custom-select" id="deliverable-input-fibbonaci"
            onChange={(event) => this.setState({points: event.target.value})}>
            <option>Complexity</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="8">8</option>
          </select>
          <label className="sr-only" htmlFor="deliverable-input-status">Status</label>
          <select className="custom-select" id="deliverable-input-status"
            onChange={(event) => this.setState({status: event.target.value})}>
            <option value="current">Current Tasks</option>
            <option value="backlog">Backlog</option>
            <option value="icebox">Icebox</option>
            <option value="complete">Completed Tasks</option>
          </select>
          <button type="submit" className="btn btn-primary">Add</button>
        </div>
      </form>
    );
  };
};

class List extends React.Component {
  constructor(props) {
    super(props);
    this.state = {project: props.project, deliverables: null};

    this.getDeliverables();
  }

  componentDidMount() {
    // Listen for a call to rerender the list
    socket.on('reload', this.getDeliverables.bind(this));
  }

  getDeliverables() {
    var context = this;
    var project = this.state.project;
    axios.get('/api/deliverables?id=' + project.id)
    .then(function(response) {
      context.state.deliverables = {};
      var deliverables = context.state.deliverables;
      deliverables.current = [];
      deliverables.backlog = [];
      deliverables.icebox = [];
      deliverables.complete = [];
      response.data.forEach(function(deliverable) {
        if (deliverable.status === 'complete') {
          deliverables.complete.push(deliverable);
        } else if (deliverable.status === 'backlog') {
          deliverables.backlog.push(deliverable);
        } else if (deliverable.status === 'icebox') {
          deliverables.icebox.push(deliverable);
        } else if (deliverable.status === 'current') {
          deliverables.current.push(deliverable);
        }
      });
      context.forceUpdate();
    });
  }

  deleteDeliverable(deliverableID) {
    axios.delete('/api/deliverables?id=' + deliverableID + '&pid=' + this.state.project.id)
    .then(function(response) {
      // Tell other clients a change occured
      socket.emit('change', 'delete');
    });
  }

  adjustDeliverable(deliverable, str) {
    var obj = {id: deliverable.id, pid: this.state.project.id}
    if (str === 'up') {
      if (deliverable.status === 'backlog') {
        obj.status = 'current';
      } else if (deliverable.status === 'icebox') {
        obj.status = 'backlog';
      } else if (deliverable.status === 'complete') {
        obj.status = 'icebox';
      }
    } else if (str === 'down') {
      if (deliverable.status === 'current') {
        obj.status = 'backlog';
      } else if (deliverable.status === 'backlog') {
        obj.status = 'icebox';
      } else if (deliverable.status === 'icebox') {
        obj.status = 'complete';
      }
    }

    axios.post('/api/adjust/deliverables', obj)
    .then(function(response) {
      socket.emit('change', 'post');
    })
  }

  render() {
    if (this.state.deliverables === null) {
      return (
        <div><i className="fa fa-spinner fa-pulse fa-5x fa-fw"></i></div>
      );
    } else {
      return (
        <div id="deliverables">
          <div className="deliverables-section-header">
            <h3 id="current">Current Tasks</h3>
          </div>
          <div className="deliverables-section-body">
            <table className="table table-hover table-bordered table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Assignee</th>
                  <th>Complexity</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {this.state.deliverables.current.map((deliverable) =>
                  <Deliverable deliverable={deliverable} deleteDeliverable={this.deleteDeliverable.bind(this)} adjustDeliverable={this.adjustDeliverable.bind(this)}/>
                )}
              </tbody>
            </table>
          </div>
          <div className="deliverables-section-header">
            <h3 id="backlog">Backlog</h3>
          </div>
          <div className="deliverables-section-body">
            <table className="table table-hover table-bordered table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Asignee</th>
                  <th>Complexity</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {this.state.deliverables.backlog.map((deliverable) =>
                  <Deliverable deliverable={deliverable} deleteDeliverable={this.deleteDeliverable.bind(this)} adjustDeliverable={this.adjustDeliverable.bind(this)}/>
                )}
              </tbody>
            </table>
          </div>
          <div className="deliverables-section-header">
            <h3 id="icebox">Icebox</h3>
          </div>
          <div className="deliverables-section-body">
            <table className="table table-hover table-bordered table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Asignee</th>
                  <th>Complexity</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {this.state.deliverables.icebox.map((deliverable) =>
                  <Deliverable deliverable={deliverable} deleteDeliverable={this.deleteDeliverable.bind(this)} adjustDeliverable={this.adjustDeliverable.bind(this)}/>
                )}
              </tbody>
            </table>
          </div>
          <div className="deliverables-section-header">
            <h3 id="completed">Completed Tasks</h3>
          </div>
          <div className="deliverables-section-body">
            <table className="table table-hover table-bordered table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Asignee</th>
                  <th>Complexity</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {this.state.deliverables.complete.map((deliverable) =>
                  <Deliverable deliverable={deliverable} deleteDeliverable={this.deleteDeliverable.bind(this)} adjustDeliverable={this.adjustDeliverable.bind(this)}/>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  }
}

      // <img src="/client/assets/upArrow.png" className="category-change-button" onClick={() => {adjustDeliverable(deliverable, 'up')}}/>
      // <img src="/client/assets/downArrow.png" className="category-change-button" onClick={() => {adjustDeliverable(deliverable, 'down')}}/>

var Deliverable = ({deliverable, deleteDeliverable, adjustDeliverable}) => (
  <tr>
    <th scope="row">{deliverable.id}</th>
    <td>{deliverable.task}</td>
    <td>{deliverable.owner}</td>
    <td>{deliverable.points}</td>
    <td>
      <i className="fa fa-times right" aria-hidden="true" onClick={() => deleteDeliverable(deliverable.id)}></i>
    </td>
  </tr>
);

exports.Form = Form;
exports.List = List;
