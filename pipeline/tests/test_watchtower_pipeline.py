import datetime
import json

import unittest
from watchtower_pipeline import __version__
from watchtower_pipeline.example import ExampleWriter
from watchtower_pipeline.kitsu import KitsuWriter, Config, KitsuClient
from watchtower_pipeline.writers import ProjectWriter


def test_version():
    assert __version__ == '1.0.0'


def test_fetch_tasks():
    config = Config('../../.env.local')
    client = KitsuClient(config=config)
    writer = KitsuWriter(kitsu_client=client)

    print(writer.get_project_list())


class TestMergeTaskCountDicts(unittest.TestCase):
    def test_merge_task_count_dicts(self):
        initial = [
            {
                'task_type_id': 'animation',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': '2020-02-01', 'count': 10},
                            {'timestamp': '2020-02-02', 'count': 15},
                        ],
                    },
                    {
                        'task_status_id': 'todo',
                        'data': [
                            {'timestamp': '2020-02-01', 'count': 10},
                            {'timestamp': '2020-02-02', 'count': 5},
                        ],
                    },
                ],
            }
        ]

        update = [
            {
                'task_type_id': 'animation',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': '2020-02-03', 'count': 17},
                        ],
                    },
                    {
                        'task_status_id': 'todo',
                        'data': [{'timestamp': '2020-02-03', 'count': 2}],
                    },
                    {
                        'task_status_id': 'in_progress',
                        'data': [{'timestamp': '2020-02-03', 'count': 1}],
                    },
                ],
            },
            {
                'task_type_id': 'lighting',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': '2020-02-03', 'count': 10},
                        ],
                    }
                ],
            },
            {
                'task_type_id': 'lighting',
                'episode_id': 'ep02',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': '2020-02-03', 'count': 10},
                        ],
                    }
                ],
            },
        ]

        expected_result = [
            {
                'task_type_id': 'animation',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': '2020-02-01', 'count': 10},
                            {'timestamp': '2020-02-02', 'count': 15},
                            {'timestamp': '2020-02-03', 'count': 17},
                        ],
                    },
                    {
                        'task_status_id': 'todo',
                        'data': [
                            {'timestamp': '2020-02-01', 'count': 10},
                            {'timestamp': '2020-02-02', 'count': 5},
                            {'timestamp': '2020-02-03', 'count': 2},
                        ],
                    },
                    {
                        'task_status_id': 'in_progress',
                        'data': [{'timestamp': '2020-02-03', 'count': 1}],
                    },
                ],
            },
            {
                'task_type_id': 'lighting',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': '2020-02-03', 'count': 10},
                        ],
                    }
                ],
            },
            {
                'task_type_id': 'lighting',
                'episode_id': 'ep02',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': '2020-02-03', 'count': 10},
                        ],
                    }
                ],
            },
        ]

        result = ProjectWriter._merge_task_count_dicts(initial, update)
        self.assertEqual(result, expected_result)


class TestParseTasks(unittest.TestCase):
    def test_parse_tasks(self):
        result = [
            {
                "canceled": False,
                "entity_type_id": "shot",
                "episode_id": "ep01",
                "sequence_id": "seq01",
                "tasks": [
                    {
                        "task_status_id": "done",
                        "task_type_id": "animation",
                    },
                    {
                        "task_status_id": "done",
                        "task_type_id": "lighting",
                    },
                    {
                        "task_status_id": "in_progress",
                        "task_type_id": "compositing",
                    },
                ],
                "type": "Shot",
            },
            {
                "canceled": False,
                "entity_type_id": "shot",
                "episode_id": "ep01",
                "sequence_id": "seq01",
                "tasks": [
                    {
                        "task_status_id": "todo",
                        "task_type_id": "animation",
                    },
                    {
                        "task_status_id": "done",
                        "task_type_id": "lighting",
                    },
                    {
                        "task_status_id": "todo",
                        "task_type_id": "compositing",
                    },
                ],
                "type": "Shot",
            },
            {
                "canceled": False,
                "entity_type_id": "shot",
                "episode_id": "ep02",
                "sequence_id": "seq01",
                "tasks": [
                    {
                        "task_status_id": "todo",
                        "task_type_id": "animation",
                    },
                    {
                        "task_status_id": "todo",
                        "task_type_id": "lighting",
                    },
                    {
                        "task_status_id": "todo",
                        "task_type_id": "compositing",
                    },
                ],
                "type": "Shot",
            },
        ]

        count = [
            {
                'task_type_id': 'animation',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': 'today', 'count': 1},
                        ],
                    },
                    {
                        'task_status_id': 'todo',
                        'data': [
                            {'timestamp': 'today', 'count': 1},
                        ],
                    },
                ],
            },
            {
                'task_type_id': 'lighting',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'done',
                        'data': [
                            {'timestamp': 'today', 'count': 2},
                        ],
                    },
                ],
            },
            {
                'task_type_id': 'compositing',
                'episode_id': 'ep01',
                'task_statuses': [
                    {
                        'task_status_id': 'in_progress',
                        'data': [
                            {'timestamp': 'today', 'count': 1},
                        ],
                    },
                    {
                        'task_status_id': 'todo',
                        'data': [
                            {'timestamp': 'today', 'count': 1},
                        ],
                    },
                ],
            },
            {
                'task_type_id': 'animation',
                'episode_id': 'ep02',
                'task_statuses': [
                    {
                        'task_status_id': 'todo',
                        'data': [
                            {'timestamp': 'today', 'count': 1},
                        ],
                    },
                ],
            },
            {
                'task_type_id': 'lighting',
                'episode_id': 'ep02',
                'task_statuses': [
                    {
                        'task_status_id': 'todo',
                        'data': [
                            {'timestamp': 'today', 'count': 1},
                        ],
                    },
                ],
            },
            {
                'task_type_id': 'compositing',
                'episode_id': 'ep02',
                'task_statuses': [
                    {
                        'task_status_id': 'todo',
                        'data': [
                            {'timestamp': 'today', 'count': 1},
                        ],
                    },
                ],
            },
        ]

        self.assertEqual(ProjectWriter.count_tasks(result, 'today'), count)

    def test_date_to_string(self):
        dt = datetime.datetime(2020, 1, 1)
        self.assertEqual(
            json.dumps({'timestamp': dt.isoformat()}), '{"timestamp": "2020-01-01T00:00:00"}'
        )
